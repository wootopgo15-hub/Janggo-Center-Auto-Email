import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Mail, CheckSquare, Square, Loader2, Send, Plus, Trash2, Eye, Check, X, DownloadCloud, AlertCircle, Settings, List, FileText, Paperclip } from 'lucide-react';
import { CenterData } from './types';

const INITIAL_DATA: CenterData[] = [];

export default function App() {
  const [centers, setCenters] = useState<CenterData[]>(INITIAL_DATA);
  const [previewEmail, setPreviewEmail] = useState<{ centerName: string; subject: string; body: string; attachments: { instructor: string; files: string[] }[]; missingDocs: string[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [phoneMap, setPhoneMap] = useState<Record<string, string>>({});

  const [globalMonth, setGlobalMonth] = useState(`${new Date().getMonth() + 1}월`);
  const [senderEmail, setSenderEmail] = useState('janggo1983@naver.com');
  const [emailSubject, setEmailSubject] = useState('{month} {centerName} 프로그램 계획안, 일지 보내드립니다.');
  const [emailBody, setEmailBody] = useState(`안녕하십니까, 장고교육개발원 입니다.

이번 {month} 교육에 참여하시는 강사님들의 계획안, 일지 보내드립니다.

[참여 강사 명단]
{instructors}

업무에 참고 부탁드리며, 문의사항이 있으시면 언제든 연락 주시기 바랍니다.
장고교육개발원 : 010-8971-4304

감사합니다.`);

  const toggleSelectAll = () => {
    const allSelected = centers.length > 0 && centers.every((c) => c.selected);
    setCenters(centers.map((c) => ({ ...c, selected: !allSelected })));
  };

  const toggleSelect = (id: string) => {
    setCenters(centers.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const addRow = () => {
    const newRow: CenterData = {
      id: Date.now().toString(),
      centerName: '',
      branch: '',
      email: '',
      music: '',
      traditional: '',
      gymnastics: '',
      tools: '',
      singing: '',
      selected: true,
    };
    setCenters([...centers, newRow]);
  };

  const removeRow = (id: string) => {
    setCenters(centers.filter((c) => c.id !== id));
  };

  const updateRow = (id: string, field: keyof CenterData, value: any) => {
    setCenters(centers.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  // 구글 시트에서 직접 데이터 불러오기 (Apps Script API 활용)
  const handleLoadFromSheet = async () => {
    setIsLoadingData(true);
    try {
      // 사용자님이 배포하신 Apps Script Web App URL에 ?action=getData 파라미터 추가
      const scriptUrl = 'https://script.google.com/macros/s/AKfycbzfwyv0hQ7IgM9r3MgG57hoe0VcgOhAQ0C-BUMJtKFzSNpuuNQrfqYcSjIME1Figx7R/exec?action=getData';

      // fetch 요청 (Apps Script는 리다이렉트를 발생시키므로 follow 설정 필요)
      const response = await fetch(scriptUrl, {
        method: 'GET',
        redirect: 'follow'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '데이터를 불러오는데 실패했습니다.');
      }

      if (result.phoneMap) {
        setPhoneMap(result.phoneMap);
      }

      const rows = result.rows;
      
      // 데이터 파싱
      const newData: CenterData[] = rows.map((row: any[], index: number) => {
        return {
          id: Date.now().toString() + index,
          centerName: String(row[0] || '').trim(),
          branch: String(row[1] || '').trim(),
          email: String(row[2] || '').trim(),
          music: String(row[3] || '').trim(),
          traditional: String(row[4] || '').trim(),
          gymnastics: String(row[5] || '').trim(),
          tools: String(row[6] || '').trim(),
          singing: String(row[7] || '').trim(),
          selected: true,
        };
      }).filter((item: CenterData) => item.centerName !== '');

      if (newData.length > 0) {
        setCenters(newData); // 기존 데이터를 덮어쓰기
        alert(`성공적으로 ${newData.length}개의 데이터를 불러왔습니다!`);
      } else {
        alert('불러올 유효한 데이터가 없습니다.');
      }

    } catch (error) {
      console.error('Apps Script 연동 에러:', error);
      alert('데이터를 불러오지 못했습니다.\n\n[원인 및 해결방법]\nApps Script 코드가 최신 버전으로 배포되었는지 확인해주세요.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePreview = async (center: CenterData) => {
    setIsLoading(true);
    setPreviewEmail(null);

    const subjectsList = [
      { key: 'music', label: '음악' },
      { key: 'traditional', label: '전래' },
      { key: 'gymnastics', label: '체조' },
      { key: 'tools', label: '교구' },
      { key: 'singing', label: '노래' }
    ];

    const instructorSubjects = subjectsList
      .flatMap(sub => {
        const rawName = center[sub.key as keyof CenterData] as string;
        if (!rawName) return [];
        // 슬래시(/)로 분리하고 양쪽 공백 제거
        return rawName.split('/').map(name => ({
          name: name.trim(),
          subject: sub.label
        }));
      })
      .filter(item => item.name !== '');

    const instructorsStr = instructorSubjects.map(inst => phoneMap[inst.name] ? `${inst.name}(${phoneMap[inst.name]})` : inst.name).join(', ');
    
    const parsedSubject = emailSubject
      .replace(/{month}/g, globalMonth)
      .replace(/{centerName}/g, center.centerName);
      
    let parsedBody = emailBody
      .replace(/{centerName}/g, center.centerName)
      .replace(/{branch}/g, center.branch)
      .replace(/{month}/g, globalMonth)
      .replace(/{instructors}/g, instructorsStr);

    try {
      const scriptUrl = 'https://script.google.com/macros/s/AKfycbzfwyv0hQ7IgM9r3MgG57hoe0VcgOhAQ0C-BUMJtKFzSNpuuNQrfqYcSjIME1Figx7R/exec';
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        body: JSON.stringify({
          action: 'previewEmail',
          center: { ...center, instructors: instructorSubjects },
          globalMonth: globalMonth
        })
      });

      const text = await response.text();
      const result = JSON.parse(text);

      if (result.success && result.data) {
        const { attachments, missingDocs } = result.data;
        
        if (missingDocs.length > 0) {
          parsedBody += `\n\n※ 안내: 다음 강사님의 자료는 현재 준비 중이거나 찾을 수 없어 첨부되지 않았습니다. (${missingDocs.join(', ')})`;
        }

        setPreviewEmail({
          centerName: center.centerName,
          subject: parsedSubject,
          body: parsedBody,
          attachments: attachments,
          missingDocs: missingDocs
        });
      } else {
        throw new Error(result.message || '미리보기 데이터를 가져오지 못했습니다.');
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('파일을 검색하는 중 오류가 발생했습니다.\nApps Script 코드가 최신 버전으로 배포되었는지 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendClick = () => {
    const selectedCenters = centers.filter((c) => c.selected);
    if (selectedCenters.length === 0) {
      alert('발송할 센터를 좌측 체크박스로 선택해주세요.');
      return;
    }
    setShowConfirmModal(true);
  };

  const executeSend = async () => {
    setShowConfirmModal(false);
    const selectedCenters = centers.filter((c) => c.selected);
    
    const subjectsList = [
      { key: 'music', label: '음악' },
      { key: 'traditional', label: '전래' },
      { key: 'gymnastics', label: '체조' },
      { key: 'tools', label: '교구' },
      { key: 'singing', label: '노래' }
    ];

    // Apps Script 호환성을 위해 instructors 배열을 {name, subject} 객체 배열로 생성
    const payloadCenters = selectedCenters.map(c => {
      const instructorSubjects = subjectsList
        .flatMap(sub => {
          const rawName = c[sub.key as keyof CenterData] as string;
          if (!rawName) return [];
          // 슬래시(/)로 분리하고 양쪽 공백 제거
          return rawName.split('/').map(name => ({
            name: name.trim(),
            subject: sub.label
          }));
        })
        .filter(item => item.name !== '');
      
      return {
        ...c,
        instructors: instructorSubjects
      };
    });

    setIsSending(true);
    try {
      const scriptUrl = 'https://script.google.com/macros/s/AKfycbzfwyv0hQ7IgM9r3MgG57hoe0VcgOhAQ0C-BUMJtKFzSNpuuNQrfqYcSjIME1Figx7R/exec';
      
      // Apps Script로 POST 요청 보내기 (CORS 우회를 위해 text/plain 사용, redirect follow 필수)
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        redirect: 'follow', // 구글 Apps Script는 리다이렉트를 발생시키므로 반드시 필요합니다.
        body: JSON.stringify({
          action: 'sendEmails',
          centers: payloadCenters,
          globalMonth: globalMonth,
          senderEmail: senderEmail,
          emailSubject: emailSubject,
          emailBody: emailBody
        })
      });

      // 응답을 먼저 텍스트로 받아서 에러 페이지(HTML)가 왔는지 확인합니다.
      const text = await response.text();
      
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("JSON 파싱 에러. 서버 응답:", text);
        throw new Error("Apps Script에서 올바른 응답을 받지 못했습니다.\n(반드시 '새 버전'으로 배포했는지 확인해주세요!)");
      }
      
      if (result.success) {
        setSentSuccess(true);
        setTimeout(() => setSentSuccess(false), 5000);
        alert('✅ 성공적으로 처리되었습니다!\n\n(참고: 실제 메일 발송은 Apps Script 코드 내의 GmailApp 주석을 해제해야 작동합니다. 현재는 드라이브 검색 테스트까지만 진행되었습니다.)');
      } else {
        throw new Error(result.message || '발송 실패');
      }
    } catch (error: any) {
      console.error('메일 발송 에러:', error);
      alert(`❌ 오류 발생:\n${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <header className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">교육 문서 자동화 시스템</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLoadFromSheet}
              disabled={isLoadingData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
              {isLoadingData ? '불러오는 중...' : '구글 시트에서 불러오기'}
            </button>
            <button
              onClick={handleSendClick}
              disabled={isSending || centers.filter(c => c.selected).length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isSending || centers.filter(c => c.selected).length === 0
                  ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSending ? '발송 중...' : '선택 발송'}
            </button>
          </div>
        </header>

        {/* Warning Notice */}
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">구글 시트 연동 필수 설정 안내</p>
            <p>데이터를 성공적으로 불러오려면, 구글 시트 우측 상단의 <strong>[공유]</strong> 버튼을 누르고 일반 액세스를 <strong>[링크가 있는 모든 사용자 - 뷰어]</strong>로 변경해야 합니다.</p>
          </div>
        </div>

        {/* Success Toast */}
        {sentSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3">
            <Check className="w-5 h-5 text-emerald-600" />
            <p className="text-sm font-medium">선택된 {centers.filter(c => c.selected).length}개의 센터로 메일이 성공적으로 발송되었습니다.</p>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Basic Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-6 border-b border-neutral-100 pb-4">
                <Settings className="w-5 h-5 text-neutral-700" />
                기본 정보
              </h2>
              
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">월 (Month)</label>
                    <input 
                      type="text" 
                      value={globalMonth} 
                      onChange={e => setGlobalMonth(e.target.value)} 
                      className="w-full p-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" 
                      placeholder="예: 03월" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-neutral-700 mb-1.5">보내는 사람 이메일 (선택)</label>
                    <select 
                      value={senderEmail} 
                      onChange={e => setSenderEmail(e.target.value)} 
                      className="w-full p-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                    >
                      <option value="">기본 계정 사용</option>
                      <option value="janggo1983@naver.com">janggo1983@naver.com</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">메일 제목</label>
                  <input 
                    type="text" 
                    value={emailSubject} 
                    onChange={e => setEmailSubject(e.target.value)} 
                    className="w-full p-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm" 
                  />
                  <p className="text-xs text-neutral-500 mt-1.5 bg-neutral-50 p-2 rounded border border-neutral-100">
                    사용 가능 변수: <code className="text-blue-600 font-mono">{`{month}`}</code>, <code className="text-blue-600 font-mono">{`{centerName}`}</code>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">메일 내용</label>
                  <textarea 
                    value={emailBody} 
                    onChange={e => setEmailBody(e.target.value)} 
                    rows={14} 
                    className="w-full p-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm resize-none" 
                  />
                  <div className="text-xs text-neutral-500 mt-1.5 bg-neutral-50 p-2 rounded border border-neutral-100 space-y-1">
                    <p>사용 가능 변수:</p>
                    <p className="font-mono text-blue-600 break-words">{`{centerName}, {branch}, {month}, {instructors}`}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Center List */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6 border-b border-neutral-100 pb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <List className="w-5 h-5 text-neutral-700" />
                  발송 대상 센터 목록
                </h2>
                <button
                  onClick={addRow}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  센터 추가
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-neutral-50 border-y border-neutral-200 text-neutral-600 font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">
                        <button onClick={toggleSelectAll} className="text-neutral-400 hover:text-neutral-600">
                          {centers.length > 0 && centers.every((c) => c.selected) ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 min-w-[120px]">수신 센터</th>
                      <th className="px-4 py-3 min-w-[100px]">소속 지사</th>
                      <th className="px-4 py-3 min-w-[160px]">이메일</th>
                      <th className="px-4 py-3 min-w-[80px]">음악</th>
                      <th className="px-4 py-3 min-w-[80px]">전래</th>
                      <th className="px-4 py-3 min-w-[80px]">체조</th>
                      <th className="px-4 py-3 min-w-[80px]">교구</th>
                      <th className="px-4 py-3 min-w-[80px]">노래</th>
                      <th className="px-4 py-3 w-24 text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {centers.map((center) => (
                      <tr key={center.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => toggleSelect(center.id)} className="text-neutral-400 hover:text-blue-600">
                            {center.selected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={center.centerName}
                            onChange={(e) => updateRow(center.id, 'centerName', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium text-neutral-900"
                            placeholder="센터명 입력"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={center.branch}
                            onChange={(e) => updateRow(center.id, 'branch', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-neutral-600"
                            placeholder="지사명 입력"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="email"
                            value={center.email}
                            onChange={(e) => updateRow(center.id, 'email', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-neutral-600"
                            placeholder="이메일 입력"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={center.music}
                            onChange={(e) => updateRow(center.id, 'music', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-neutral-600"
                            placeholder="음악 강사"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={center.traditional}
                            onChange={(e) => updateRow(center.id, 'traditional', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-neutral-600"
                            placeholder="전래 강사"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={center.gymnastics}
                            onChange={(e) => updateRow(center.id, 'gymnastics', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-neutral-600"
                            placeholder="체조 강사"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={center.tools}
                            onChange={(e) => updateRow(center.id, 'tools', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-neutral-600"
                            placeholder="교구 강사"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={center.singing}
                            onChange={(e) => updateRow(center.id, 'singing', e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-neutral-600"
                            placeholder="노래 강사"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handlePreview(center)}
                              className="p-1.5 text-neutral-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="메일 미리보기"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeRow(center.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {centers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-neutral-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <List className="w-8 h-8 text-neutral-300" />
                            <p>등록된 센터가 없습니다.</p>
                            <p className="text-sm text-neutral-400">상단의 '구글 시트에서 불러오기' 버튼을 눌러주세요.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {(previewEmail || isLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Mail className="w-5 h-5 text-neutral-400" />
                메일 미리보기 {previewEmail && <span className="text-neutral-400 text-sm font-normal">({previewEmail.centerName})</span>}
              </h3>
              <button
                onClick={() => setPreviewEmail(null)}
                disabled={isLoading}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-neutral-50/50">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                  <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                  <p className="font-medium text-neutral-700">구글 드라이브에서 파일을 검색하고 있습니다...</p>
                  <p className="text-sm text-neutral-400 mt-2">강사 수에 따라 몇 초 정도 걸릴 수 있습니다.</p>
                </div>
              ) : previewEmail ? (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-1">제목</div>
                    <div className="font-medium text-neutral-900">{previewEmail.subject}</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                    <div className="text-xs font-medium text-neutral-400 uppercase tracking-wider mb-2">내용</div>
                    {previewEmail.body}
                  </div>
                  
                  {previewEmail.attachments && previewEmail.attachments.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
                      <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Check className="w-4 h-4" />
                        첨부 예정 파일 (드라이브에서 찾음)
                      </div>
                      <div className="space-y-3">
                        {previewEmail.attachments.map((att, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="font-semibold text-neutral-800 mb-1.5">{att.instructor}</div>
                            <ul className="space-y-1.5">
                              {att.files.map((file, fIdx) => (
                                <li key={fIdx} className="flex items-center gap-2 text-neutral-700 bg-emerald-50/50 px-2.5 py-2 rounded-lg border border-emerald-100">
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span className="truncate font-medium">{file}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewEmail.missingDocs && previewEmail.missingDocs.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                      <div className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4" />
                        파일을 찾을 수 없는 강사
                      </div>
                      <p className="text-sm font-medium text-red-700 mb-2">
                        {previewEmail.missingDocs.join(', ')}
                      </p>
                      <p className="text-[12px] text-red-500 leading-relaxed">
                        * 구글 드라이브(계획안,일지 &gt; 기본정보 {globalMonth}) 폴더에 위 강사 이름이 포함된 파일이 없습니다.<br/>
                        * 이대로 발송하면 누락된 강사의 파일은 첨부되지 않습니다.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
            
            <div className="px-6 py-4 border-t border-neutral-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setPreviewEmail(null)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Send className="w-5 h-5 text-neutral-400" />
                발송 전 최종 확인
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-full hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-neutral-50/50">
              <div className="mb-6">
                <p className="text-neutral-900 font-medium text-lg">
                  총 <span className="text-blue-600 font-bold">{centers.filter(c => c.selected).length}</span>개의 센터로 메일을 발송합니다.
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  구글 드라이브에서 강사별 문서를 자동으로 찾아 링크를 첨부하여 아래 대상에게 발송합니다.
                </p>
              </div>
              
              <div className="space-y-3">
                {centers.filter(c => c.selected).map(center => (
                  <div key={center.id} className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-neutral-900">{center.centerName} <span className="text-neutral-500 text-sm font-normal">({center.branch})</span></div>
                      <div className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">{center.email || '이메일 없음'}</div>
                    </div>
                    <div className="text-sm text-neutral-600 mt-1">
                      <span className="font-medium text-neutral-400 mr-2">참여 강사:</span> 
                      {[center.music, center.traditional, center.gymnastics, center.tools, center.singing]
                        .filter(Boolean)
                        .map(name => phoneMap[name] ? `${name}(${phoneMap[name]})` : name)
                        .join(', ') || '없음'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-neutral-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeSend}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                실제 발송하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

