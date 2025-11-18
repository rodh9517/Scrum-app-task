import { Task, Project, User, TaskStatus } from '../types';

// Declare global variables from CDNs
declare const jspdf: any;
declare const Chart: any;

// --- STYLING CONSTANTS ---
const FONT_FAMILY = 'helvetica';
const PRIMARY_BRAND_COLOR = '#254467';

const STATUS_DONE_COLOR = '#50E3C2';
const STATUS_INPROGRESS_COLOR = '#4A90E2';
const STATUS_TODO_COLOR = '#F5A623';

const LINE_IDEAL_COLOR = '#9CA3AF';
const TEXT_PRIMARY_DARK_BG = '#FFFFFF';
const TEXT_PRIMARY_LIGHT_BG = '#1F2937';
const TEXT_SECONDARY_LIGHT_BG = '#6B7280';
const TABLE_HEADER_COLOR = '#E5E7EB';
const BORDER_COLOR = '#D1D5DB';

// --- LOGO FOR DARK BACKGROUND ---
const LOGO_FOR_DARK_BG_SVG_STRING = `<svg viewBox="0 0 210 75" xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif"><g transform="translate(81, 0)"><path fillRule="evenodd" clipRule="evenodd" d="M0 0H16V16H0V0ZM0 24V40H16V24H0ZM16 16H32V24H16V16ZM32 0V40H48V0H32ZM16 40L32 24V40H16Z" fill="#D85929"></path></g><text x="105" y="68" fontSize="24" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">HERMOSILLO<tspan fontSize="10" dy="-12">®</tspan></text></svg>`;

// Helper to convert SVG to PNG
const svgToPngDataURL = (svgString: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Render at 2x for better quality
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const pngDataUrl = canvas.toDataURL('image/png');
                URL.revokeObjectURL(url);
                resolve(pngDataUrl);
            } else {
                URL.revokeObjectURL(url);
                reject(new Error('Could not get canvas context'));
            }
        };
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load SVG image'));
        };
        img.src = url;
    });
};


// --- CHART PLUGINS ---
const customPlugins = {
  // Plugin to draw a background color on the chart
  customCanvasBackgroundColor: {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart: any, args: any, options: any) => {
      const { ctx } = chart;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      ctx.fillStyle = options.color || '#FFFFFF';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  },
  // Plugin to draw text in the middle of a doughnut chart
  doughnutCenterText: {
    id: 'doughnutCenterText',
    afterDraw: (chart: any) => {
      if (chart.config.type !== 'doughnut' || !chart.options.plugins.doughnutCenterText) {
        return;
      }
      const { ctx } = chart;
      const { text, subtext, color, font, subfont } = chart.options.plugins.doughnutCenterText;
      const { x, y } = chart.getDatasetMeta(0).data[0];
      
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.font = font || `bold 18px ${FONT_FAMILY}`;
      ctx.fillStyle = color || TEXT_PRIMARY_LIGHT_BG;
      ctx.fillText(text, x, y - 8);

      if (subtext) {
        ctx.font = subfont || `11px ${FONT_FAMILY}`;
        ctx.fillStyle = TEXT_SECONDARY_LIGHT_BG;
        ctx.fillText(subtext, x, y + 12);
      }
      ctx.restore();
    }
  }
};


// Helper to render a chart.js instance to a base64 image
const renderChartToImage = async (chartConfig: any, width: number, height: number): Promise<string> => {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) {
        return '';
    }

    const chart = new Chart(ctx, {
        ...chartConfig,
        options: {
            ...chartConfig.options,
            animation: false, // Disable animation for synchronous rendering
            responsive: false, // Important for offscreen canvas to respect width/height
            plugins: {
                ...chartConfig.options?.plugins,
                // Ensure background is not transparent for better rendering in PDF
                customCanvasBackgroundColor: {
                    color: 'white',
                }
            }
        },
        plugins: [
            customPlugins.customCanvasBackgroundColor,
            ...(chartConfig.plugins || [])
        ]
    });
    
    const image = chart.toBase64Image();
    chart.destroy();
    
    return image;
};


export const generateReport = async (tasks: Task[], projects: Project[], users: User[]) => {
    const { jsPDF } = jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [630, 420], // Custom format to better match aspect ratio
    });

    // --- DATA PROCESSING ---
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => t.status === TaskStatus.Done);
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.InProgress);
    const todoTasks = tasks.filter(t => t.status === TaskStatus.ToDo);

    const doneCount = doneTasks.length;
    const inProgressCount = inProgressTasks.length;
    const todoCount = todoTasks.length;

    const tasksByProject = projects.map(p => ({
        name: p.name.length > 15 ? p.name.substring(0, 12) + '...' : p.name,
        count: tasks.filter(t => t.projectId === p.id).length
    }));
    
    // --- CHART GENERATION ---

    // 1. Task Status Doughnut Chart
    const statusChartConfig = {
        type: 'doughnut',
        data: {
            labels: ['Completadas', 'En Progreso', 'Por Hacer'],
            datasets: [{
                data: [doneCount, inProgressCount, todoCount],
                backgroundColor: [STATUS_DONE_COLOR, STATUS_INPROGRESS_COLOR, STATUS_TODO_COLOR],
                borderColor: '#FFFFFF',
                borderWidth: 2,
            }]
        },
        options: {
            cutout: '70%',
            plugins: {
                legend: { display: false },
                doughnutCenterText: {
                    text: `${totalTasks}`,
                    subtext: 'Tareas Totales',
                }
            }
        },
        plugins: [customPlugins.doughnutCenterText]
    };

    // 2. Tasks per Project Bar Chart
    const projectChartConfig = {
        type: 'bar',
        data: {
            labels: tasksByProject.map(p => p.name),
            datasets: [{
                label: 'Nº de Tareas',
                data: tasksByProject.map(p => p.count),
                backgroundColor: PRIMARY_BRAND_COLOR,
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { display: false },
                    ticks: { precision: 0 }
                },
                y: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: 'Tareas por Proyecto',
                    align: 'start',
                    font: { size: 14, weight: 'bold', family: FONT_FAMILY },
                    color: TEXT_PRIMARY_LIGHT_BG,
                    padding: { bottom: 10 }
                }
            }
        }
    };

    // Render charts to images
    const statusChartImage = await renderChartToImage(statusChartConfig, 400, 400);
    const projectChartImage = await renderChartToImage(projectChartConfig, 800, 600);
    
    const logoWidth = 70;
    const logoHeight = 25;
    const logoForDarkBgPngDataUrl = await svgToPngDataURL(LOGO_FOR_DARK_BG_SVG_STRING, logoWidth, logoHeight);


    // --- PDF LAYOUT ---

    // Page margin
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    
    // Header
    doc.setFillColor(PRIMARY_BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 60, 'F');
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(22);
    doc.setTextColor(TEXT_PRIMARY_DARK_BG);
    doc.text('Reporte de Productividad', margin, 35);
    doc.setFontSize(10);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.text(new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }), margin, 48);
    
    // Add logo to the header
    const logoY = (60 - logoHeight) / 2;
    doc.addImage(logoForDarkBgPngDataUrl, 'PNG', pageWidth - margin - logoWidth, logoY, logoWidth, logoHeight);

    let yPos = 80; // Start content below header

    // Add charts
    const statusChartWidth = 120;
    const statusChartHeight = 120;
    
    doc.setFontSize(14);
    doc.setFont(FONT_FAMILY, 'bold');
    doc.setTextColor(TEXT_PRIMARY_LIGHT_BG);
    doc.text('Resumen de Tareas', margin, yPos);
    doc.addImage(statusChartImage, 'PNG', margin, yPos + 10, statusChartWidth, statusChartHeight);
    
    const projectChartX = margin + statusChartWidth + 20;
    const projectChartWidth = contentWidth - statusChartWidth - 20;
    const projectChartHeight = 160;
    doc.addImage(projectChartImage, 'PNG', projectChartX, yPos, projectChartWidth, projectChartHeight);
    
    yPos = yPos + projectChartHeight + 20;

    // --- TASK LIST TABLE ---
    doc.setFontSize(14);
    doc.setFont(FONT_FAMILY, 'bold');
    doc.text('Detalle de Tareas Recientes (Hasta 10)', margin, yPos);
    
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    const recentTasks = [...tasks]
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
    
    (doc as any).autoTable({
      startY: yPos + 10,
      head: [['Título', 'Proyecto', 'Responsable', 'Estado']],
      body: recentTasks.map(task => [
        task.title,
        projectMap[task.projectId]?.name || 'N/A',
        userMap[task.responsibleId]?.name || 'N/A',
        task.status
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: TABLE_HEADER_COLOR,
        textColor: TEXT_PRIMARY_LIGHT_BG,
        fontStyle: 'bold'
      },
      styles: {
        font: FONT_FAMILY,
        fontSize: 9,
        cellPadding: 4,
      },
      margin: { left: margin, right: margin }
    });


    // --- SAVE PDF ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(TEXT_SECONDARY_LIGHT_BG);
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    doc.save(`reporte-productividad-${new Date().toISOString().split('T')[0]}.pdf`);
};