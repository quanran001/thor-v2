'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Headset, User, Sparkles, Download, FileSpreadsheet, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
// import mermaid from 'mermaid'; // Removed static import to prevent SSR crash
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

// --- Types ---
type Message = {
    role: 'user' | 'assistant';
    content: string;
    sopData?: any;
};

// --- Mermaid Component ---
const MermaidChart = ({ chart }: { chart: string }) => {
    const [renderId, setRenderId] = useState<string>('');

    useEffect(() => {
        // Generate ID only on client-side to prevent Hydration Mismatch
        setRenderId(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
    }, []);

    useEffect(() => {
        if (chart && renderId) {
            import('mermaid').then(mermaid => {
                mermaid.default.initialize({
                    startOnLoad: true,
                    theme: 'base',
                    themeVariables: {
                        darkMode: true,
                        mainBkg: '#0f172a', // Slate-900
                        primaryColor: '#0f172a',
                        primaryTextColor: '#f8fafc', // Slate-50 White
                        primaryBorderColor: '#22d3ee', // Cyan-400
                        lineColor: '#94a3b8', // Slate-400
                        secondaryColor: '#1e293b',
                        tertiaryColor: '#0f172a',
                        noteBkgColor: '#0f172a',
                        noteTextColor: '#f8fafc',
                    },
                    securityLevel: 'loose',
                    fontFamily: 'sans-serif'
                });
                const elem = document.getElementById(renderId);
                if (elem) {
                    elem.removeAttribute('data-processed');
                    try {
                        mermaid.default.contentLoaded();
                    } catch (e) {
                        console.error('Mermaid render error', e);
                    }
                }
            });
        }
    }, [chart, renderId]);

    if (!renderId) return <div className="animate-pulse bg-white/5 h-20 rounded mb-2"></div>;

    return (
        <div className="bg-[#0B0F19] p-4 rounded-lg my-2 border border-slate-800 overflow-x-auto">
            <div className="mermaid" id={renderId}>
                {chart
                    .replace(/（/g, '(').replace(/）/g, ')')
                    .replace(/【/g, '[').replace(/】/g, ']')
                    .replace(/：/g, ':')
                    .replace(/；/g, ';')
                    .replace(/“/g, '"').replace(/”/g, '"')
                }
            </div>
        </div>
    );
};

// --- SOP Card Component ---
const SOPCard = ({ data }: { data: any }) => {
    if (!data) return null;

    const handleExport = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'SOP Alchemist AI';
            workbook.created = new Date();

            // --- Sheet 1: SOP Execution Table ---
            const sheet1 = workbook.addWorksheet('SOP执行表', {
                views: [{ state: 'frozen', ySplit: 1, showGridLines: false }]
            });

            // Define Columns
            sheet1.columns = [
                { header: '序号', key: 'id', width: 8 },
                { header: '角色 (Role)', key: 'role', width: 15 },
                { header: '核心动作 (Action)', key: 'action', width: 50 },
                { header: '交付标准 (Standard)', key: 'standard', width: 30 },
                { header: '风险/备注 (Risk)', key: 'risk', width: 25 },
            ];

            // Add Data
            data.steps?.forEach((step: any, idx: number) => {
                sheet1.addRow({
                    id: idx + 1,
                    role: step.role,
                    action: step.action,
                    standard: step.standard,
                    risk: step.risk || ''
                });
            });

            // Apply Styles
            sheet1.eachRow((row, rowNumber) => {
                row.height = rowNumber === 1 ? 30 : 25; // Optimized Heights

                row.eachCell((cell) => {
                    // Borders
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD4D4D4' } },
                        left: { style: 'thin', color: { argb: 'FFD4D4D4' } },
                        bottom: { style: 'thin', color: { argb: 'FFD4D4D4' } },
                        right: { style: 'thin', color: { argb: 'FFD4D4D4' } }
                    };
                    // Font & Alignment
                    cell.font = { name: 'Microsoft YaHei', size: 10 };
                    cell.alignment = { vertical: 'middle', wrapText: true, horizontal: rowNumber === 1 ? 'center' : 'left' };

                    // Header Styling
                    if (rowNumber === 1) {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FF1E293B' } // Dark Slate Blue
                        };
                        cell.font = { name: 'Microsoft YaHei', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; // White
                    }
                });
            });

            // --- Sheet 2: Diagnosis ---
            if (data.diagnosis?.length > 0) {
                const sheet2 = workbook.addWorksheet('自动化诊断', { views: [{ showGridLines: false }] });
                sheet2.columns = [
                    { header: '诊断类型', key: 'type', width: 20 },
                    { header: '分析与建议', key: 'desc', width: 60 },
                ];

                data.diagnosis.forEach((d: any) => {
                    sheet2.addRow({ type: d.type, desc: d.desc });
                });

                sheet2.eachRow((row, rowNumber) => {
                    row.height = 25;
                    row.eachCell((cell) => {
                        cell.alignment = { vertical: 'middle', wrapText: true };
                        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
                        if (rowNumber === 1) {
                            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }; // Amber-700
                        }
                    });
                });
            }

            // Export
            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer]), `${data.title || 'SOP_Blueprint'}.xlsx`);

        } catch (error) {
            console.error("Export failed:", error);
            alert("导出失败：" + error);
        }
    };



    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mt-2 w-full max-w-4xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
                <div>
                    <h3 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
                        <Sparkles size={18} />
                        {data.title || "未命名流程"}
                    </h3>
                    <p className="text-slate-400 text-xs">{data.summary}</p>
                </div>
                <button
                    onClick={handleExport}
                    className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
                >
                    <Download size={12} /> 导出 Excel
                </button>
            </div>

            {/* Layout: Graph + Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Logic Flow (Visual) */}
                <div className="flex flex-col">
                    <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
                        <LayoutDashboard size={12} /> 逻辑可视化 (Logic Flow)
                    </h4>

                    {data.mermaid ? (
                        <MermaidChart chart={data.mermaid} />
                    ) : (
                        <div className="h-32 bg-white/5 rounded flex items-center justify-center text-xs text-gray-500">暂无图表</div>
                    )}

                    {/* Diagnosis */}
                    {data.diagnosis && data.diagnosis.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {data.diagnosis.map((diag: any, idx: number) => (
                                <div key={idx} className="bg-amber-900/20 border border-amber-900/50 p-2 rounded text-xs text-amber-200 flex gap-2">
                                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                    <span>{diag.desc || diag.description || diag.suggestion || "暂无描述"}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Execution Steps (Table) */}
                <div>
                    <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1">
                        <FileSpreadsheet size={12} /> 执行步骤 (Steps)
                    </h4>
                    <div className="overflow-x-auto rounded-lg border border-slate-700 scrollbar-thin scrollbar-thumb-slate-700">
                        <table className="w-full text-left text-xs text-slate-300 min-w-[500px]">
                            <thead className="bg-slate-800 text-slate-400 uppercase font-medium">
                                <tr>
                                    {/* Smart Column Widths: Role narrow, Action main focus, Standard secondary */}
                                    <th className="px-3 py-2 w-[12%]">角色</th>
                                    <th className="px-3 py-2 w-[55%]">核心动作</th>
                                    <th className="px-3 py-2 w-[33%]">交付标准</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                                {data.steps?.map((step: any, i: number) => (
                                    <tr key={i} className="hover:bg-cyan-900/10 transition-colors">
                                        <td className="px-3 py-2 font-medium text-cyan-200 break-words align-top">{step.role || step.Role}</td>
                                        <td className="px-3 py-2 align-top">{step.action || step.Action || step.content || "-"}</td>
                                        <td className="px-3 py-2 text-slate-300 align-top">{step.standard || step.Standard || step.output || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function Home() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '您好！我是索尔 (Thor)，您的 SOP 流程咨询顾问。🎧\n\n我致力于帮您 **理清复杂的工作逻辑**，将混乱的 **会议纪要**、**聊天记录** 或 **业务构想**，提炼为清晰的 **SOP 蓝图** 与 **标准化执行方案**。\n\n请问，今天有什么工作流程需要我帮您梳理的吗？' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        const history = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        try {
            const res = await fetch('/api/sop/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, history }),
            });

            if (!res.ok) throw new Error('API Error');

            const data = await res.json();

            // Hybrid Logic: Handle 'chat' vs 'sop' modes
            let saveMsg = "";
            if (data.type === 'sop') {
                try {
                    // Auto-Save to Feishu
                    const saveRes = await fetch('/api/sop/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ sopData: data.sop_data })
                    });
                    if (saveRes.ok) {
                        saveMsg = "\n\n(📝 蓝图已自动归档至飞书数据库)";
                    }
                } catch (e) {
                    console.error("Feishu save failed", e);
                }
            }

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: (data.message || (data.type === 'sop' ? '✅ 炼金完成！' : '...')) + saveMsg,
                sopData: data.type === 'sop' ? data.sop_data : undefined
            }]);

        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ 炼金失败，请检查网络或稍后重试。' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex flex-col h-screen bg-[#0B0F19] text-gray-100 overflow-hidden font-sans selection:bg-cyan-500/30">
            {/* Header */}
            <header className="p-4 border-b border-slate-800 flex items-center justify-between backdrop-blur-md bg-[#0B0F19]/90 fixed top-0 w-full z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white">SOP Alchemist <span className="text-xs font-normal text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded ml-2 border border-cyan-900">v2.1 Beta</span></span>
                </div>
                <div className="flex items-center gap-4">
                    {/* Link removed as requested */}
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto pt-24 pb-48 px-4 md:px-0">
                <div className="max-w-5xl mx-auto space-y-8">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border overflow-hidden ${msg.role === 'assistant'
                                ? 'bg-slate-800/80 border-slate-700 text-cyan-400'
                                : 'bg-cyan-600 border-cyan-500 text-white'
                                }`}>
                                {msg.role === 'assistant' ? (
                                    <img src="/thor_avatar.png" alt="Thor" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>

                            <div className={`flex flex-col max-w-[90%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-5 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20'
                                    : 'bg-slate-800/50 text-slate-200 border border-slate-700/50'
                                    }`}>
                                    {msg.content}
                                </div>

                                {/* Render SOP Data if available */}
                                {msg.sopData && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        transition={{ duration: 0.4 }}
                                        className="w-full"
                                    >
                                        <SOPCard data={msg.sopData} />
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                                <img src="/thor_avatar.png" alt="Thor" className="w-full h-full object-cover animate-pulse" />
                            </div>
                            <div className="bg-slate-800/50 px-5 py-3 rounded-2xl border border-slate-700/50 flex items-center gap-2">
                                <span className="text-xs text-slate-400">正在炼金中...</span>
                                <span className="flex gap-1">
                                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="h-64" /> {/* Extra Spacer for Input Box Obstruction */}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="fixed bottom-0 w-full bg-gradient-to-t from-[#0B0F19] via-[#0B0F19] to-transparent pt-12 pb-8 px-4 z-10">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="relative group">
                        {/* Fix: Added pointer-events-none to prevent blocking clicks */}
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl opacity-20 group-hover:opacity-100 transition duration-1000 blur group-hover:blur-md pointer-events-none"></div>
                        <div className="relative flex items-end bg-slate-900 rounded-xl border border-slate-700 focus-within:border-cyan-500/50 shadow-2xl overflow-hidden z-[50]">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (input.trim() && !isLoading) {
                                            handleSubmit(e as any);
                                        }
                                    }
                                }}
                                placeholder="输入混乱的会议纪要、工作杂事描述..."
                                className="w-full bg-transparent text-white placeholder-slate-500 py-3 pl-4 pr-14 focus:outline-none resize-none h-24 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent text-sm leading-relaxed"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="absolute right-2 bottom-2 p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg disabled:opacity-50 disabled:bg-slate-700 transition-all z-[60] cursor-pointer"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-xs text-slate-600 mt-3 font-mono">
                        Powered by DeepSeek V3 · SOP Alchemist V2.1
                    </p>
                </div>
            </div>
        </main>
    );
}
