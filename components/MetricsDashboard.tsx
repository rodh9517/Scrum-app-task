import React, { useMemo, useState } from 'react';
import { Task, Project, User, TaskStatus } from '../types';
import { DownloadIcon } from './Icons';
import { generateReport } from '../services/ReportGenerator';

interface MetricsDashboardProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
}

const calculateCycleTimeInDays = (start: string, end: string): number => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return diffTime / (1000 * 60 * 60 * 24);
};

const MetricCard: React.FC<{ title: string; value: string; }> = ({ title, value }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
  </div>
);

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ tasks, projects, users }) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const metrics = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === TaskStatus.Done && t.completedAt && t.createdAt);

    const totalCycleTime = completedTasks.reduce((acc, task) => {
      return acc + calculateCycleTimeInDays(task.createdAt, task.completedAt!);
    }, 0);

    const averageCycleTime = completedTasks.length > 0 ? totalCycleTime / completedTasks.length : 0;

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

    return {
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        averageCycleTime: averageCycleTime,
        projectMetrics: projectMetrics
    };
  }, [tasks, projects]);

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      // A small timeout to allow UI update before blocking the main thread
      await new Promise(resolve => setTimeout(resolve, 50)); 
      await generateReport(tasks, projects, users);
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Hubo un error al generar el reporte en PDF.");
    } finally {
      setIsGeneratingReport(false);
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Métricas de Eficiencia</h1>
            <p className="text-gray-600 mt-1">Un resumen del rendimiento de los proyectos y tareas.</p>
        </div>
        <button
          onClick={handleGenerateReport}
          disabled={isGeneratingReport}
          className="flex items-center gap-2 px-4 py-2 bg-[#D85929] hover:bg-[#C0481A] text-white font-semibold rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <DownloadIcon className="w-5 h-5" />
          {isGeneratingReport ? 'Generando...' : 'Generar Reporte'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total de Tareas" value={metrics.totalTasks.toString()} />
        <MetricCard title="Tareas Completadas" value={metrics.completedTasks.toString()} />
        <MetricCard title="Tiempo de Ciclo Promedio" value={`${metrics.averageCycleTime.toFixed(1)} días`} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Desglose por Proyecto</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3">Proyecto</th>
                <th scope="col" className="px-6 py-3 text-center">Tareas Totales</th>
                <th scope="col" className="px-6 py-3 text-center">Tareas Completadas</th>
                <th scope="col" className="px-6 py-3">Tasa de Finalización</th>
                <th scope="col" className="px-6 py-3 text-right">Ciclo Promedio (días)</th>
              </tr>
            </thead>
            <tbody>
              {metrics.projectMetrics.map(p => (
                <tr key={p.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }}></span>
                    {p.name}
                  </td>
                  <td className="px-6 py-4 text-center">{p.totalTasks}</td>
                  <td className="px-6 py-4 text-center">{p.completedTasks}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-[#254467] h-2.5 rounded-full" style={{ width: `${p.completionRate}%` }}></div>
                      </div>
                      <span className="font-medium text-gray-700">{p.completionRate.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{p.averageCycleTime.toFixed(1)}</td>
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
    </div>
  );
};