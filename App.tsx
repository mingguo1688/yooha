
import React, { useState, useRef, useEffect } from 'react';
import { 
  Scale, 
  Send, 
  Paperclip, 
  Trash2, 
  Plus, 
  MessageSquare, 
  FileText, 
  AlertCircle,
  Menu,
  X,
  Gavel,
  ShieldCheck,
  BrainCircuit,
  Settings,
  Database,
  Key
} from 'lucide-react';
import { Role, Message, Attachment, ChatSession } from './types';
import { generateLegalAdvice } from './services/legalService';

const App: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [deepseekApiKey, setDeepseekApiKey] = useState(localStorage.getItem('deepseek_api_key') || '');
  const [engine, setEngine] = useState<'gemini' | 'deepseek'>((localStorage.getItem('preferred_engine') as any) || 'gemini');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  useEffect(() => {
    if (sessions.length === 0) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: '新咨询',
        messages: [],
        updatedAt: new Date()
      };
      setSessions([newSession]);
      setCurrentSessionId(newSession.id);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSession?.messages, isLoading]);

  const saveSettings = () => {
    localStorage.setItem('deepseek_api_key', deepseekApiKey);
    localStorage.setItem('preferred_engine', engine);
    setShowSettings(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachments(prev => [...prev, {
          name: file.name,
          type: file.type,
          data: base64,
          preview: file.type.startsWith('image/') ? base64 : undefined
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      content: input,
      attachments: [...attachments],
      timestamp: new Date()
    };

    const updatedSessions = sessions.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMessage],
          title: s.messages.length === 0 ? (input.slice(0, 15) || '法律文档分析') : s.title,
          updatedAt: new Date()
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const response = await generateLegalAdvice(
        input || "请分析上传的附件。",
        currentSession?.messages || [],
        userMessage.attachments,
        { engine, deepseekApiKey }
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.ASSISTANT,
        content: response,
        timestamp: new Date()
      };

      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return {
            ...s,
            messages: [...s.messages, aiMessage],
            updatedAt: new Date()
          };
        }
        return s;
      }));
    } catch (error: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: Role.ASSISTANT,
        content: `❌ 咨询失败: ${error.message || "引擎波动，请检查网络或设置。"}`,
        timestamp: new Date()
      };
      setSessions(prev => prev.map(s => {
        if (s.id === currentSessionId) {
          return { ...s, messages: [...s.messages, errorMessage] };
        }
        return s;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: '新法律咨询',
      messages: [],
      updatedAt: new Date()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (currentSessionId === id) {
      setCurrentSessionId(filtered[0]?.id || null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Settings className="h-5 w-5 text-amber-600" />
                系统设置
              </div>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Database className="h-4 w-4 text-slate-400" />
                  推理引擎选择
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button 
                    onClick={() => setEngine('gemini')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${engine === 'gemini' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Gemini Pro
                  </button>
                  <button 
                    onClick={() => setEngine('deepseek')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${engine === 'deepseek' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    DeepSeek-V3
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Key className="h-4 w-4 text-slate-400" />
                  DeepSeek API Key
                </label>
                <input 
                  type="password"
                  value={deepseekApiKey}
                  onChange={(e) => setDeepseekApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                />
                <p className="mt-2 text-[10px] text-slate-400 leading-tight">
                  提示: 密钥仅保存在您的浏览器本地(LocalStorage)，不会上传到我们的服务器。
                </p>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-all"
              >
                取消
              </button>
              <button 
                onClick={saveSettings}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-600/20 transition-all"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-slate-900 transition-all duration-300 flex flex-col overflow-hidden shadow-2xl z-20`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-lg">
              <Scale className="text-white h-6 w-6" />
            </div>
            <h1 className="font-bold text-white text-lg tracking-tight">LexiMind AI</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <button 
          onClick={createNewSession}
          className="m-4 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg active:scale-95"
        >
          <Plus className="h-5 w-5" />
          发起法律咨询
        </button>

        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          <div className="space-y-2 pb-4">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent ${
                  currentSessionId === session.id 
                    ? 'bg-slate-800 border-slate-700 shadow-inner' 
                    : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className={`h-4 w-4 shrink-0 ${currentSessionId === session.id ? 'text-amber-500' : 'text-slate-500'}`} />
                  <span className={`truncate text-sm ${currentSessionId === session.id ? 'text-white font-medium' : 'text-slate-300'}`}>
                    {session.title}
                  </span>
                </div>
                <button 
                  onClick={(e) => deleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <button 
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 w-full p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all text-sm"
          >
            <Settings className="h-4 w-4" />
            系统设置
          </button>
          <div className="text-slate-500 text-[10px] px-2">
            <div className="flex items-center gap-2 mb-1 text-slate-400">
              <ShieldCheck className="h-3 w-3" />
              <span>专业 · 严谨 · 加密</span>
            </div>
            <p>© 2024 LexiMind 法律实验室</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Menu className="h-5 w-5 text-slate-600" />
              </button>
            )}
            <div>
              <h2 className="font-semibold text-slate-800">法律咨询详情</h2>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <BrainCircuit className={`h-3 w-3 ${engine === 'gemini' ? 'text-amber-600' : 'text-blue-600'}`} /> 
                  {engine === 'gemini' ? 'Gemini 深度推理' : 'DeepSeek 语义分析'}
                </span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span>加密通道</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
               <div className={`w-2 h-2 rounded-full animate-pulse ${engine === 'gemini' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
               <span className="text-[11px] font-bold text-slate-600 uppercase">{engine} Engine Active</span>
             </div>
             <div className="flex -space-x-2">
                {[1,2].map(i => (
                  <img key={i} className="h-8 w-8 rounded-full border-2 border-white shadow-sm" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i === 1 ? 'legal' : 'expert'}`} alt="Avatar" />
                ))}
             </div>
          </div>
        </header>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-8 custom-scrollbar">
          {currentSession?.messages.length === 0 && (
            <div className="max-w-3xl mx-auto py-12 text-center">
              <div className="bg-amber-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Gavel className="h-10 w-10 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">您好，我是您的私人法律助手</h3>
              <p className="text-slate-500 max-w-lg mx-auto leading-relaxed text-sm">
                您可以向我咨询各类法律问题，如：劳动争议、房产纠纷、婚姻家庭、合同审查或刑事法律。支持上传合同照片或 PDF 文档。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 text-left">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all cursor-pointer group" onClick={() => setInput("我收到一份裁员通知书，公司拒绝支付补偿金，我该如何维权？")}>
                  <p className="font-semibold text-slate-700 text-sm mb-1 group-hover:text-amber-600 transition-colors">劳动维权咨询</p>
                  <p className="text-xs text-slate-500">分析非法裁员补偿及赔偿金计算</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md transition-all cursor-pointer group" onClick={() => setInput("请帮我审查一下刚收到的租房合同，看看有没有陷阱？")}>
                  <p className="font-semibold text-slate-700 text-sm mb-1 group-hover:text-amber-600 transition-colors">合同文本审查</p>
                  <p className="text-xs text-slate-500">识别合同中的风险条款和不公平条约</p>
                </div>
              </div>
            </div>
          )}

          {currentSession?.messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === Role.USER ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[75%] ${message.role === Role.USER ? 'order-2' : ''}`}>
                <div className={`flex items-start gap-3 ${message.role === Role.USER ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${message.role === Role.USER ? 'bg-slate-800' : 'bg-amber-600'}`}>
                    {message.role === Role.USER ? <div className="text-white text-[10px] font-bold">用户</div> : <Scale className="h-4 w-4 text-white" />}
                  </div>
                  <div className={`flex flex-col ${message.role === Role.USER ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-2xl px-5 py-4 shadow-sm ${
                      message.role === Role.USER 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-4 space-y-2">
                          {message.attachments.map((att, i) => (
                            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs overflow-hidden ${message.role === Role.USER ? 'bg-black/10' : 'bg-white/50 border border-slate-200'}`}>
                              {att.preview ? (
                                <img src={att.preview} className="h-8 w-8 object-cover rounded shadow-sm" alt="Preview" />
                              ) : (
                                <FileText className="h-4 w-4 text-amber-600" />
                              )}
                              <span className="truncate max-w-[150px] font-medium">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-[14px] leading-relaxed whitespace-pre-wrap font-medium">
                        {message.content}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1.5 px-2">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3">
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm animate-pulse ${engine === 'gemini' ? 'bg-amber-600' : 'bg-blue-600'}`}>
                  <Scale className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-100 rounded-2xl px-6 py-4 flex flex-col gap-2 border border-slate-200/50">
                  <div className="flex items-center gap-2">
                     <div className="flex space-x-1">
                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${engine === 'gemini' ? 'bg-amber-600' : 'bg-blue-600'}`} style={{ animationDelay: '0ms' }}></div>
                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${engine === 'gemini' ? 'bg-amber-600' : 'bg-blue-600'}`} style={{ animationDelay: '150ms' }}></div>
                        <div className={`w-1.5 h-1.5 rounded-full animate-bounce ${engine === 'gemini' ? 'bg-amber-600' : 'bg-blue-600'}`} style={{ animationDelay: '300ms' }}></div>
                     </div>
                     <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{engine === 'gemini' ? 'Gemini' : 'DeepSeek'} 分析中...</span>
                  </div>
                  <p className="text-xs text-slate-400">正在检索相关法律条文并评估案件风险...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto">
            {/* Attachment Previews */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {attachments.map((att, i) => (
                  <div key={i} className="group relative bg-white border border-slate-200 rounded-lg p-2 pr-8 flex items-center gap-2 shadow-sm">
                    {att.preview ? (
                      <img src={att.preview} className="h-6 w-6 rounded object-cover shadow-xs" alt="Thumb" />
                    ) : (
                      <FileText className="h-4 w-4 text-amber-600" />
                    )}
                    <span className="text-[11px] text-slate-600 max-w-[120px] truncate">{att.name}</span>
                    <button 
                      onClick={() => removeAttachment(i)}
                      className="absolute right-1 p-1 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-amber-500/10 focus-within:border-amber-500 transition-all shadow-xs">
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-slate-500 hover:bg-white hover:text-amber-600 rounded-xl transition-all"
                  title="上传文档或图片"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple 
                  accept="image/*,.pdf" 
                  onChange={handleFileUpload} 
                />
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="请输入您的法律问题或描述案件背景..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] py-2.5 max-h-48 min-h-[44px] custom-scrollbar resize-none"
                rows={1}
              />

              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className={`p-3 rounded-xl transition-all shadow-lg active:scale-95 ${
                  isLoading || (!input.trim() && attachments.length === 0)
                    ? 'bg-slate-300 cursor-not-allowed'
                    : engine === 'gemini' 
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
                }`}
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mt-3 flex items-center justify-between px-2">
               <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 cursor-pointer group">
                    <input type="checkbox" className="rounded text-amber-600 focus:ring-amber-500" defaultChecked />
                    法律检索增强
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 cursor-pointer group">
                    <input type="checkbox" className="rounded text-amber-600 focus:ring-amber-500" defaultChecked />
                    生成执行方案
                  </label>
               </div>
               <div className="flex items-center gap-1 text-[11px] text-slate-400">
                 <AlertCircle className="h-3 w-3" />
                 AI 回答仅供参考，不具有法律效力
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
