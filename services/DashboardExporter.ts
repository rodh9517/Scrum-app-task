import { Task, Project, User } from '../types';

declare const jspdf: any;
declare const html2canvas: any;

const LOGO_SVG_STRING = `<svg viewBox="0 0 210 75" xmlns="http://www.w3.org/2000/svg" fontFamily="sans-serif"><g transform="translate(81, 0)"><path fillRule="evenodd" clipRule="evenodd" d="M0 0H16V16H0V0ZM0 24V40H16V24H0ZM16 16H32V24H16V16ZM32 0V40H48V0H32ZM16 40L32 24V40H16Z" fill="#D85929"></path></g><text x="105" y="68" fontSize="24" fontWeight="bold" fill="#254467" textAnchor="middle">HERMOSILLO<tspan fontSize="10" dy="-12">®</tspan></text></svg>`;

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


export const exportDashboardAsPDF = async (
  tasks: Task[],
  projects: Project[],
  users: User[],
  kanbanElement: HTMLElement
) => {
  const { jsPDF } = jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: 'a4'
  });

  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoWidth = 70;
  const logoHeight = 25;

  const logoPngDataUrl = await svgToPngDataURL(LOGO_SVG_STRING, logoWidth, logoHeight);

  // --- KANBAN BOARD SECTION ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Vista de Tablero Kanban', margin, margin - 10);
  doc.addImage(logoPngDataUrl, 'PNG', pageWidth - margin - logoWidth, margin - 30, logoWidth, logoHeight);

  const canvas = await html2canvas(kanbanElement, {
    scale: 2, // Higher scale for better quality
    useCORS: true,
    backgroundColor: '#f3f4f6' // Match app background
  });
  
  const imgData = canvas.toDataURL('image/jpeg', 0.9);
  const imgProps = doc.getImageProperties(imgData);
  
  const contentStartY = margin + 10;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - contentStartY - (margin / 2); // Room for footer

  let imgWidth = availableWidth;
  let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = (imgProps.width * imgHeight) / imgProps.height;
  }

  const x = (pageWidth - imgWidth) / 2; // Center the image
  doc.addImage(imgData, 'JPEG', x, contentStartY, imgWidth, imgHeight);


  // --- LIST VIEW SECTION ---
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Vista de Lista de Tareas', margin, margin - 10);
  doc.addImage(logoPngDataUrl, 'PNG', pageWidth - margin - logoWidth, margin - 30, logoWidth, logoHeight);

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const userMap = Object.fromEntries(users.map(u => [u.id, u.name]));

  const tableColumns = ['Título', 'Proyecto', 'Responsable', 'Estado', 'Subtareas'];
  const tableRows = tasks.map(task => {
    const completedSubtasks = task.subtasks.filter(st => st.completed).length;
    const subtaskText = task.subtasks.length > 0 ? `${completedSubtasks} / ${task.subtasks.length}` : 'N/A';
    return [
      task.title,
      projectMap[task.projectId] || 'N/A',
      userMap[task.responsibleId] || 'N/A',
      task.status,
      subtaskText
    ];
  });

  (doc as any).autoTable({
    head: [tableColumns],
    body: tableRows,
    startY: contentStartY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: '#254467',
      textColor: '#FFFFFF',
      fontStyle: 'bold'
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 4,
    },
  });
  
  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  doc.save(`dashboard-export-${new Date().toISOString().split('T')[0]}.pdf`);
};