import React from "react";
import { 
  Bell, LayoutDashboard, Globe, Users, FileText, Settings, Plus, 
  ChevronDown, Monitor, ShieldCheck, AlertTriangle, ShieldAlert, FileWarning,
  Info, Check, RefreshCw, X, FileSearch, Plug, Palette, Server, Activity, ArrowRight,
  MoreVertical, Clock
} from "lucide-react";

export function Dashboard() {
  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}} />
      
      {/* Sidebar */}
      <div className="w-[220px] bg-[#0f172a] text-white flex flex-col h-full flex-shrink-0">
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white leading-tight">SitePulse</div>
            <div className="text-xs text-slate-400">Onset Media</div>
          </div>
        </div>

        <div className="flex-1 px-3 py-2 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 bg-[#2563eb] text-white rounded-md text-sm font-medium">
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Bell size={18} />
            <span className="flex-1">Alerts</span>
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">2</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Globe size={18} />
            Sites
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Users size={18} />
            Clients
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <FileText size={18} />
            Reports
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Users size={18} />
            Users
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Settings size={18} />
            Settings
          </a>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 mb-4 group text-left">
            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center shrink-0 group-hover:bg-green-500 group-hover:text-white transition-colors">
              <Plus size={16} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-200">Add New Site</div>
              <div className="text-[11px] text-slate-400">Monitor a new WordPress site</div>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-3 group text-left">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              AY
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold text-white truncate">Asfand Yar</div>
              <div className="text-[11px] text-slate-400 truncate">admin@sitepulse.local</div>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Internal MVP</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Dashboard</h1>
            <p className="text-sm text-slate-500">Monitor connected WordPress sites, update pressure, and sync freshness.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-medium text-slate-600">API Online</span>
              <div className="w-px h-3 bg-slate-300 mx-1"></div>
              <span className="text-xs text-slate-500">https://sitepulse-api-84m8.ornender.com</span>
              <button className="text-xs font-medium text-blue-600 ml-2">Test</button>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                AY
              </div>
              <span className="text-sm font-medium text-slate-700">Asfand Yar</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
            <button className="text-xs font-medium text-slate-600 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50">
              Logout
            </button>
          </div>
        </header>

        {/* Refresh bar */}
        <div className="bg-slate-50/80 px-6 py-2 flex justify-end items-center gap-3 border-b border-slate-100 shrink-0">
          <span className="text-xs text-slate-500">Last refreshed 3 seconds ago</span>
          <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md text-xs font-medium transition-colors">
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          
          {/* Metric Cards Row */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { icon: <Monitor size={16} />, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", value: "2", label: "TOTAL SITES", dot: "bg-slate-400", detail: "1 unknown" },
              { icon: <ShieldCheck size={16} />, iconBg: "bg-green-100", iconColor: "text-green-600", value: "0", label: "HEALTHY", dot: "bg-slate-300", detail: "No active flags" },
              { icon: <AlertTriangle size={16} />, iconBg: "bg-yellow-100", iconColor: "text-yellow-500", value: "0", label: "NEEDS ATTENTION", dot: "bg-slate-300", detail: "No issues" },
              { icon: <ShieldAlert size={16} />, iconBg: "bg-red-100", iconColor: "text-red-600", value: "1", label: "CRITICAL RISK", dot: "bg-red-500", detail: "High-priority risk" },
              { icon: <FileWarning size={16} />, iconBg: "bg-slate-100", iconColor: "text-slate-500", value: "3", label: "UNMONITORED PAGES", dot: "bg-amber-500", detail: "Important pages" },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className={`w-8 h-8 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-3`}>
                  {card.icon}
                </div>
                <div className="text-[30px] font-[800] text-slate-900 leading-none mb-1">{card.value}</div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{card.label}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${card.dot}`}></span>
                  {card.detail}
                </div>
              </div>
            ))}
          </div>

          {/* Primary Row */}
          <div className="flex gap-6">
            {/* Website Health Overview */}
            <div className="bg-white border border-slate-200 rounded-[14px] w-[57%] flex flex-col shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Website Health Overview</h2>
                <Info size={13} className="text-slate-400" />
              </div>
              <div className="p-5 flex gap-6 flex-1 items-start">
                <div className="w-[140px] flex flex-col items-center justify-center shrink-0 pt-2">
                  <div className="relative w-[110px] h-[110px] flex items-center justify-center mb-2">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                      <circle cx="50" cy="50" r="40" stroke="#22c55e" strokeWidth="10" fill="none" strokeDasharray="251.2" strokeDashoffset="55.26" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900 leading-none">78</span>
                      <span className="text-xs font-medium text-slate-500">/100</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-1.5">Overall Health Score</div>
                  <div className="bg-green-100 text-green-700 text-[11px] font-semibold px-2 py-0.5 rounded-full">Good</div>
                </div>
                
                <div className="flex-1 pt-1">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-2 font-semibold">Area</th>
                        <th className="pb-2 font-semibold">Status</th>
                        <th className="pb-2 font-semibold text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {[
                        { icon: <ShieldAlert size={13} className="text-amber-500" />, label: "Security posture", badge: "bg-amber-100 text-amber-700", status: "Needs attention", score: "60/100" },
                        { icon: <Plug size={13} className="text-amber-500" />, label: "Plugin update pressure", badge: "bg-amber-100 text-amber-700", status: "Some updates", score: "70/100" },
                        { icon: <Activity size={13} className="text-green-500" />, label: "Monitoring coverage", badge: "bg-green-100 text-green-700", status: "Good", score: "80/100" },
                        { icon: <RefreshCw size={13} className="text-green-500" />, label: "Sync freshness", badge: "bg-green-100 text-green-700", status: "Good", score: "90/100" },
                        { icon: <Clock size={13} className="text-green-500" />, label: "Page response performance", badge: "bg-green-100 text-green-700", status: "Good", score: "85/100" },
                      ].map((row, i, arr) => (
                        <tr key={i} className={i < arr.length - 1 ? "border-b border-slate-50" : ""}>
                          <td className="py-2 font-medium text-slate-700">
                            <div className="flex items-center gap-1.5">{row.icon}{row.label}</div>
                          </td>
                          <td className="py-2"><span className={`${row.badge} text-[11px] px-2 py-0.5 rounded-full font-medium`}>{row.status}</span></td>
                          <td className="py-2 text-right text-[12px] font-semibold text-slate-600">{row.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="px-5 py-3 border-t border-slate-100">
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  View full health report <ArrowRight size={12} />
                </a>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="bg-white border border-slate-200 rounded-[14px] w-[43%] flex flex-col shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recommended Actions</h2>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">View all actions <ArrowRight size={12} /></a>
              </div>
              <div className="flex flex-col divide-y divide-slate-100">
                {[
                  { priority: "Critical", priorityBg: "bg-red-100 text-red-700", title: "Fix 2 critical WordPress security risks", sub: "File editor enabled and debug mode active", site: "Thincscorp Website", btnBg: "bg-red-600 hover:bg-red-700 text-white", btn: "Fix Now" },
                  { priority: "High", priorityBg: "bg-orange-100 text-orange-700", title: "Enable monitoring for important pages", sub: "3 important pages are not being monitored", site: "Thincscorp Website", btnBg: "bg-blue-600 hover:bg-blue-700 text-white", btn: "Monitor" },
                  { priority: "Medium", priorityBg: "bg-yellow-100 text-yellow-700", title: "Update 1 outdated plugin", sub: "1 plugin update is available", site: "Onset Demo Website", btnBg: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50", btn: "Review" },
                  { priority: "Low", priorityBg: "bg-green-100 text-green-700", title: "Check sync freshness", sub: "1 site not synced in last 24 hours", site: "Onset Demo Website", btnBg: "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50", btn: "Open" },
                ].map((a, i) => (
                  <div key={i} className="px-4 py-3 flex gap-3">
                    <div className="shrink-0 pt-0.5">
                      <span className={`${a.priorityBg} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{a.priority}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-slate-900 mb-0.5 leading-snug">{a.title}</div>
                      <div className="text-[11px] text-slate-500 mb-2 leading-snug">{a.sub}</div>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5 rounded">{a.site}</span>
                        <button className={`${a.btnBg} text-[11px] font-semibold px-2.5 py-1 rounded-md`}>{a.btn}</button>
                        <button className="text-slate-400 hover:text-slate-600 ml-auto"><MoreVertical size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Secondary Row */}
          <div className="flex gap-6">
            {/* Recently Synced Sites */}
            <div className="bg-white border border-slate-200 rounded-[14px] w-[45%] flex flex-col shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recently Synced Sites</h2>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">View all sites <ArrowRight size={12} /></a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-4 py-2.5 font-semibold">Site</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Last Seen</th>
                      <th className="px-3 py-2.5 font-semibold">Plugin Updates</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold shrink-0">TC</div>
                          <div>
                            <div className="font-semibold text-slate-900 text-[12px]">Thincscorp Website</div>
                            <div className="text-[11px] text-slate-500">thincscorp.com</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="bg-red-100 text-red-700 text-[11px] font-bold px-2 py-0.5 rounded-full">Critical</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12px] font-medium text-slate-900">5 hours ago</div>
                        <div className="text-[11px] text-slate-500">5 Jun 2026, 16:56</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5 rounded-full">0 Updates</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={14} /></button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0">EC</div>
                          <div>
                            <div className="font-semibold text-slate-900 text-[12px]">Onset Demo Website</div>
                            <div className="text-[11px] text-slate-500">example.com</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="bg-slate-100 text-slate-600 text-[11px] font-bold px-2 py-0.5 rounded-full">Unknown</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-[12px] font-medium text-slate-900">16 hours ago</div>
                        <div className="text-[11px] text-slate-500">5 Jun 2026, 5:48</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="bg-amber-100 text-amber-700 text-[11px] font-medium px-2 py-0.5 rounded-full">1 Update</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={14} /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monitoring Coverage */}
            <div className="bg-white border border-slate-200 rounded-[14px] w-[27%] flex flex-col shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Monitoring Coverage</h2>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">View full report <ArrowRight size={12} /></a>
              </div>
              <div className="p-5 flex flex-col items-center">
                <div className="relative w-[100px] h-[100px] flex items-center justify-center mb-1.5">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                    <circle cx="50" cy="50" r="40" stroke="#3b82f6" strokeWidth="10" fill="none" strokeDasharray="251.2" strokeDashoffset="60.28" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-slate-900 leading-none">76%</span>
                  </div>
                </div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-4">Coverage Score</div>

                <div className="w-full space-y-2">
                  {[
                    { dot: "bg-blue-500", label: "Connected Sites", value: "2" },
                    { dot: "bg-indigo-500", label: "Pages Discovered", value: "14" },
                    { dot: "bg-green-500", label: "Pages Monitored", value: "8" },
                    { dot: "bg-amber-500", label: "Unmonitored (Imp.)", value: "3" },
                    { dot: "bg-purple-500", label: "Synced (Last 12h)", value: "1" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`}></span>
                        <span className="truncate">{row.label}</span>
                      </div>
                      <div className="flex-1 border-b border-dotted border-slate-200 mx-2"></div>
                      <span className="font-bold text-slate-900 shrink-0">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Update Pressure */}
            <div className="bg-white border border-slate-200 rounded-[14px] w-[28%] flex flex-col shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Update Pressure</h2>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">View updates <ArrowRight size={12} /></a>
              </div>
              <div className="p-3 space-y-1">
                {[
                  { icon: <Plug size={15} />, iconBg: "bg-amber-100 text-amber-600", label: "Plugin Updates", count: "1", countBg: "bg-amber-100 text-amber-700" },
                  { icon: <Palette size={15} />, iconBg: "bg-slate-100 text-slate-500", label: "Theme Updates", count: "0", countBg: "bg-slate-100 text-slate-600" },
                  { icon: <Server size={15} />, iconBg: "bg-slate-100 text-slate-500", label: "WordPress Core", count: "0", countBg: "bg-slate-100 text-slate-600" },
                  { icon: <Globe size={15} />, iconBg: "bg-amber-100 text-amber-600", label: "Sites Needing Updates", count: "1", countBg: "bg-amber-100 text-amber-700" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg ${item.iconBg} flex items-center justify-center shrink-0`}>
                        {item.icon}
                      </div>
                      <span className="text-[12px] font-semibold text-slate-800">{item.label}</span>
                    </div>
                    <span className={`${item.countBg} text-[11px] font-bold w-6 h-6 rounded-full flex items-center justify-center`}>{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex gap-6 pb-6">
            {/* Recent Page Checks */}
            <div className="bg-white border border-slate-200 rounded-[14px] w-[60%] flex flex-col shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recent Page Checks</h2>
                <div className="flex gap-4">
                  <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">Manage monitored pages <ArrowRight size={12} /></a>
                  <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">View all page checks <ArrowRight size={12} /></a>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-4 py-2.5 font-semibold">Site</th>
                      <th className="px-3 py-2.5 font-semibold">Page</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                      <th className="px-3 py-2.5 font-semibold">Response</th>
                      <th className="px-4 py-2.5 font-semibold">Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { initials: "TC", site: "Thincscorp Website", page: "Homepage", url: "https://thincscorp.com/", status: "OK", dot: "bg-green-500", response: "3130 ms", checked: "2 hours ago" },
                      { initials: "TC", site: "Thincscorp Website", page: "Homepage", url: "https://thincscorp.com/", status: "OK", dot: "bg-green-500", response: "935 ms", checked: "14 hours ago" },
                    ].map((row, i, arr) => (
                      <tr key={i} className={i < arr.length - 1 ? "border-b border-slate-100" : ""}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold shrink-0">{row.initials}</div>
                            <span className="font-semibold text-slate-900 text-[12px]">{row.site}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="text-[12px] font-medium text-slate-900">{row.page}</div>
                          <div className="text-[11px] text-slate-500">{row.url}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${row.dot}`}></span>
                            <span className="text-[12px] font-medium text-slate-700">{row.status}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-[12px] font-medium text-slate-700">{row.response}</span>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-slate-600">{row.checked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-slate-200 rounded-[14px] w-[40%] flex flex-col shadow-sm">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recent Activity</h2>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1">View all activity <ArrowRight size={12} /></a>
              </div>
              <div className="p-4 relative">
                <div className="absolute left-[35px] top-4 bottom-4 w-px bg-slate-200"></div>
                <div className="space-y-4 relative">
                  {[
                    { bg: "bg-green-100 text-green-600", icon: <RefreshCw size={13} />, label: "Thincscorp Website synced successfully", time: "5 hours ago", tag: null },
                    { bg: "bg-amber-100 text-amber-600", icon: <AlertTriangle size={13} />, label: "Debug mode is enabled", time: "5 hours ago", tag: "Thincscorp Website" },
                    { bg: "bg-blue-100 text-blue-600", icon: <Monitor size={13} />, label: "Homepage checked", time: "2 hours ago", tag: "Thincscorp Website" },
                    { bg: "bg-purple-100 text-purple-600", icon: <FileWarning size={13} />, label: "New important page discovered", time: "1 day ago", tag: "/pricing" },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className={`w-7 h-7 rounded-full ${item.bg} flex items-center justify-center shrink-0 relative z-10 border-[3px] border-white`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex justify-between items-start gap-3 mb-1">
                          <div className="font-medium text-slate-900 text-[12px] leading-snug">{item.label}</div>
                          <div className="text-[11px] text-slate-500 shrink-0">{item.time}</div>
                        </div>
                        {item.tag && <span className="bg-slate-100 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded">{item.tag}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
