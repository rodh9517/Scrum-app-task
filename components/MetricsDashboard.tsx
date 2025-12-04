
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { DownloadIcon, MagicIcon, ChartIcon, UserGroupIcon } from './Icons';
import { generateReport } from '../services/ReportGenerator';
import { PRIORITY_WEIGHTS, DURATION_WEIGHTS, PRIORITY_COLORS } from '../constants';
import { generatePerformanceAnalysis } from '../services/geminiService';
import { UserAvatar } from './UserAvatar';

// Declare Chart.js global
declare const Chart: any;

interface MetricsDashboardProps {
  tasks: Task[];
  archivedTasks: Task[]; // New Prop for History Data
  projects: Project[];
  users: User[];
}

const calculateCycleTimeInDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return diffTime / (1000 * 60 * 60 * 24);
};

const MetricCard: React.FC<{ title: string; value: string; subtitle?: string }> = ({ title, value, subtitle }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
    {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
  </div>
);

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ tasks, archivedTasks, projects, users }) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const priorityChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // AI Analysis State
  const [analysisStartDate, setAnalysisStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of current month
    return d.toISOString().split('T')[0];
  });
  const [analysisEndDate, setAnalysisEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0]; // Today
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReportHtml, setAiReportHtml] = useState<string | null>(null);

  const metrics = useMemo(() => {
    // Only use ACTIVE tasks (not archived) for these visual metrics
    const completedTasks = tasks.filter(t => t.status === TaskStatus.Done && t.completedAt && t.createdAt);
    const todoOrProgressTasks = tasks.filter(t => t.status !== TaskStatus.Done);

    const totalCycleTime = completedTasks.reduce((acc, task) => {
      return acc + calculateCycleTimeInDays(task.createdAt, task.completedAt!);
    }, 0);

    const averageCycleTime = completedTasks.length > 0 ? totalCycleTime / completedTasks.length : 0;
    
    // New Metrics Calculation
    let totalDurationScore = 0;
    let totalUrgencyScore = 0;

    todoOrProgressTasks.forEach(t => {
        totalDurationScore += DURATION_WEIGHTS[t.duration || '1 día'];
        totalUrgencyScore += PRIORITY_WEIGHTS[t.priority || 'Baja'];
    });

    // Priority Distribution
    const priorityDist: Record<TaskPriority, number> = {
        'Baja': 0, 'Moderada': 0, 'Media': 0, 'Alta': 0, 'Urgente': 0
    };
    
    tasks.forEach(t => {
        const p = t.priority || 'Baja';
        priorityDist[p] = (priorityDist[p] || 0) + 1;
    });

    // --- PROJECT METRICS ---
    const projectMetrics = projects.map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const completedProjectTasks = projectTasks.filter(t => t.status === TaskStatus.Done && t.completedAt && t.createdAt);
        
        const projectCycleTime = completedProjectTasks.reduce((acc, task) => {
            return acc + calculateCycleTimeInDays(task.createdAt, task.completedAt!);
        }, 0);
        
        const avgProjectCycleTime = completedProjectTasks.length > 0 ? projectCycleTime / completedProjectTasks.length : 0;
        
        return {
            ...project,
            totalTasks: projectTasks.length,
            completedTasks: completedProjectTasks.length,
            completionRate: projectTasks.length > 0 ? (completedProjectTasks.length / projectTasks.length) * 100 : 0,
            averageCycleTime: avgProjectCycleTime
        };
    }).sort((a, b) => b.totalTasks - a.totalTasks);

    // --- USER WORKLOAD METRICS (NEW) ---
    const userMetrics = users.map(user => {
        const userTasks = tasks.filter(t => t.responsibleId === user.id);
        const completedUserTasks = userTasks.filter(t => t.status === TaskStatus.Done);
        const pendingUserTasks = userTasks.filter(t => t.status !== TaskStatus.Done);

        // Calculate "Current Load" based on Duration weights of PENDING tasks
        const currentLoadScore = pendingUserTasks.reduce((acc, t) => {
            return acc + DURATION_WEIGHTS[t.duration || '1 día'];
        }, 0);

        return {
            ...user,
            totalTasks: userTasks.length,
            completedTasks: completedUserTasks.length,
            completionRate: userTasks.length > 0 ? (completedUserTasks.length / userTasks.length) * 100 : 0,
            currentLoadScore
        };
    }).sort((a, b) => b.currentLoadScore - a.currentLoadScore); // Sort by busiest user

    return {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        averageCycleTime: averageCycleTime,
        totalDurationScore,
        totalUrgencyScore,
        priorityDist,
        projectMetrics: projectMetrics,
        userMetrics: userMetrics // Added to return
    };
  }, [tasks, projects, users]);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50)); 
      await generateReport(tasks, projects, users);
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Hubo un error al generar el reporte en PDF.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (!analysisStartDate || !analysisEndDate) return;
    setIsAnalyzing(true);
    setAiReportHtml(null);
    try {
        // COMBINE active tasks + archived tasks for AI Analysis ONLY
        const allTasksForAi = [...tasks, ...archivedTasks];
        
        const report = await generatePerformanceAnalysis(allTasksForAi, users, analysisStartDate, analysisEndDate);
        setAiReportHtml(report);
    } catch (error) {
        console.error("AI Analysis failed", error);
    } finally {
        setIsAnalyzing(false);
    }
  };

  // Effect to render Priority Chart
  useEffect(() => {
    if (priorityChartRef.current && metrics) {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const labels = Object.keys(metrics.priorityDist);
        const data = Object.values(metrics.priorityDist);
        const bgColors = labels.map(l => PRIORITY_COLORS[l as TaskPriority]);

        chartInstanceRef.current = new Chart(priorityChartRef.current, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Tareas por Prioridad',
                    data: data,
                    backgroundColor: bgColors,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                }
            }
        });
    }

    return () => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
    };
  }, [metrics]);


  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Métricas de Eficiencia</h1>
            <p className="text-gray-600 mt-1">Un resumen del rendimiento, cargas de trabajo y prioridades (Excluye histórico visualmente).</p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport}
          className="flex items-center gap-2 px-4 py-2 bg-[#D85929] hover:bg-[#C0481A] text-white font-semibold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap self-end md:self-auto"
        >
          <DownloadIcon className="w-5 h-5" />
          {isGeneratingReport ? 'Generando...' : 'Generar Reporte PDF'}
        </button>
      </div>
      
      {/* Top Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total de Tareas (Activas)" value={metrics.totalTasks.toString()} />
        <MetricCard title="Tareas Completadas (Activas)" value={metrics.completedTasks.toString()} />
        <MetricCard 
            title="Carga de Trabajo Est." 
            value={metrics.totalDurationScore.toString()} 
            subtitle="Puntos basados en duración de tareas pendientes"
        />
        <MetricCard 
            title="Puntuación de Urgencia" 
            value={metrics.totalUrgencyScore.toString()} 
            subtitle="Puntos basados en prioridad de tareas pendientes"
        />
      </div>

      {/* --- AI PERFORMANCE ANALYSIS SECTION --- */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
                <h2 className="text-xl font-bold text-[#254467] flex items-center gap-2">
                    <MagicIcon className="w-6 h-6 text-purple-600" />
                    Análisis de Ciclo con IA
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Genera un reporte incluyendo tareas <strong>Activas e Históricas</strong> completadas en el periodo.
                </p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 w-full md:w-auto">
                 <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase px-1">Del:</span>
                    <input 
                        type="date" 
                        value={analysisStartDate}
                        onChange={(e) => setAnalysisStartDate(e.target.value)}
                        className="text-sm text-gray-700 bg-transparent focus:outline-none"
                    />
                 </div>
                 <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase px-1">Al:</span>
                    <input 
                        type="date" 
                        value={analysisEndDate}
                        onChange={(e) => setAnalysisEndDate(e.target.value)}
                        className="text-sm text-gray-700 bg-transparent focus:outline-none"
                    />
                 </div>
                 <button 
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-[#254467] hover:bg-[#1a3350] text-white font-semibold rounded-lg transition-colors disabled:opacity-70 shadow-md w-full sm:w-auto justify-center"
                 >
                    {isAnalyzing ? (
                        <span className="animate-pulse">Analizando...</span>
                    ) : (
                        <>
                            <span>Generar Análisis</span>
                            <ChartIcon className="w-4 h-4" />
                        </>
                    )}
                 </button>
            </div>
        </div>
        
        {/* Report Container */}
        {aiReportHtml && !isAnalyzing && (
            <div className="bg-white rounded-lg p-6 shadow-inner border border-gray-200 animate-fade-in">
                <div 
                    className="prose max-w-none text-gray-700 space-y-4"
                    dangerouslySetInnerHTML={{ __html: aiReportHtml }}
                />
                 <div className="mt-4 text-[10px] text-gray-400 text-right italic">
                    Generado por Gemini AI basado en ponderaciones de Prioridad y Duración (Incluye histórico).
                </div>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Priority Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
             <h2 className="text-lg font-bold text-gray-800 mb-4">Distribución por Prioridad (Activas)</h2>
             <div className="h-64">
                <canvas ref={priorityChartRef}></canvas>
             </div>
          </div>
          
          {/* Cycle Time Card (Reused logic, just highlighted) */}
          <div className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-center items-center text-center">
             <h2 className="text-lg font-bold text-gray-800 mb-2">Tiempo de Ciclo Promedio</h2>
             <div className="text-5xl font-bold text-[#254467] my-4">{metrics.averageCycleTime.toFixed(1)} <span className="text-lg text-gray-500 font-normal">días</span></div>
             <p className="text-sm text-gray-500 max-w-xs">
                Tiempo promedio desde la creación hasta la finalización de las tareas activas.
             </p>
          </div>
      </div>

      {/* Projects Breakdown */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Desglose por Proyecto (Activas)</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-xs sm:text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-2 py-3 sm:px-4">Proyecto</th>
                <th scope="col" className="px-1 py-3 sm:px-4 text-center">Tareas Totales</th>
                <th scope="col" className="px-1 py-3 sm:px-4 text-center">Tareas Completadas</th>
                <th scope="col" className="px-1 py-3 sm:px-4 text-center">Tasa de Finalización</th>
                <th scope="col" className="px-1 py-3 sm:px-4 text-center">Ciclo Promedio (días)</th>
              </tr>
            </thead>
            <tbody>
              {metrics.projectMetrics.map(p => (
                <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-2 py-4 sm:px-4 font-medium text-gray-900">
                     <div className="flex items-center gap-1.5 sm:gap-3">
                        <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }}></span>
                        <span className="truncate max-w-[120px] sm:max-w-none block" title={p.name}>{p.name}</span>
                     </div>
                  </td>
                  <td className="px-1 py-4 sm:px-4 text-center">{p.totalTasks}</td>
                  <td className="px-1 py-4 sm:px-4 text-center">{p.completedTasks}</td>
                  <td className="px-1 py-4 sm:px-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="hidden sm:block w-full bg-gray-200 rounded-full h-2.5 max-w-[80px]">
                        <div className="bg-[#254467] h-2.5 rounded-full" style={{ width: `${p.completionRate}%` }}></div>
                      </div>
                      <span className="font-medium text-gray-700 text-xs sm:text-sm">{p.completionRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-1 py-4 sm:px-4 text-center font-medium">{p.averageCycleTime.toFixed(1)}</td>
                </tr>
              ))}
              {metrics.projectMetrics.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">No hay proyectos para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Breakdown (NEW) */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            Desglose por Responsable (Carga de Trabajo)
        </h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-xs sm:text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-2 py-3 sm:px-4">Responsable</th>
                <th scope="col" className="px-1 py-3 sm:px-4 text-center">Tareas Asignadas (Activas)</th>
                <th scope="col" className="px-1 py-3 sm:px-4 text-center">Tareas Completadas</th>
                <th scope="col" className="px-1 py-3 sm:px-4 text-center">Tasa de Finalización</th>
                <th scope="col" className="px-1 py-3 sm:px-4 text-center">Carga Actual (Puntos)</th>
              </tr>
            </thead>
            <tbody>
              {metrics.userMetrics.map(u => (
                <tr key={u.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-2 py-4 sm:px-4 font-medium text-gray-900">
                     <div className="flex items-center gap-2">
                        <UserAvatar user={u} size="small" />
                        <span className="truncate max-w-[120px] sm:max-w-none">{u.name}</span>
                     </div>
                  </td>
                  <td className="px-1 py-4 sm:px-4 text-center">{u.totalTasks}</td>
                  <td className="px-1 py-4 sm:px-4 text-center">{u.completedTasks}</td>
                  <td className="px-1 py-4 sm:px-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="hidden sm:block w-full bg-gray-200 rounded-full h-2.5 max-w-[80px]">
                        <div className={`h-2.5 rounded-full ${u.completionRate === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${u.completionRate}%` }}></div>
                      </div>
                      <span className="font-medium text-gray-700 text-xs sm:text-sm">{u.completionRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-1 py-4 sm:px-4 text-center font-bold text-gray-800">
                      {u.currentLoadScore > 0 ? (
                          <span className={`px-2 py-1 rounded-full text-xs ${u.currentLoadScore > 30 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                              {u.currentLoadScore} pts
                          </span>
                      ) : (
                          <span className="text-gray-400 text-xs">-</span>
                      )}
                  </td>
                </tr>
              ))}
              {metrics.userMetrics.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">No hay usuarios con tareas asignadas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
