import { Task, Project, User } from '../types';

declare const jspdf: any;
declare const html2canvas: any;

// LOGO URL
const LOGO_URL = "https://i.imgur.com/aPiqHxa.png";


// Helper to convert Image URL to Data URL
const urlToDataUrl = (url: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous"; 
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Scale up for better resolution in PDF
            canvas.width = img.width * 2;
            canvas.height = img.height * 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve(dataUrl);
                } catch (error) {
                    console.warn("Could not process logo:", error);
                    resolve(''); 
                }
            } else {
                resolve('');
            }
        };
        img.onerror = () => {
            console.warn("Failed to load logo image for PDF export");
            resolve('');
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
  
  // Adjusted dimensions for the logo to match aspect ratio of the full SVG
  const logoWidth = 140; 
  const logoHeight = 35; 

  // Use the constant Base64 URL directly instead of converting from an external URL.
  // This avoids network dependency and tainting the canvas.
  const logoPngDataUrl = await urlToDataUrl(LOGO_URL);

  // --- KANBAN BOARD SECTION ---
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 68, 103); // #254467
  doc.text('Vista de Tablero Kanban', margin, margin - 10);
  
  if (logoPngDataUrl) {
      doc.addImage(logoPngDataUrl, 'PNG', pageWidth - margin - logoWidth, margin - 35, logoWidth, logoHeight);
  }

  // --- LOGIC CHANGE FOR MOBILE EXPORT ---
  // 1. Clone the element to avoid modifying the live UI
  const clone = kanbanElement.cloneNode(true) as HTMLElement;

  // 2. Force DESKTOP specific styling on the clone
  clone.style.width = '1280px';
  clone.style.position = 'absolute';
  clone.style.top = '-10000px'; // Hide it off-screen
  clone.style.left = '0';
  clone.style.backgroundColor = '#f3f4f6'; 
  clone.style.zIndex = '-9999';

  // 3. Force Grid Layout for Kanban
  const gridContainer = clone.querySelector('.grid');
  if (gridContainer instanceof HTMLElement) {
      gridContainer.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
  }

  // 4. Append clone to body so html2canvas can render it
  document.body.appendChild(clone);

  let imgData;
  let imgProps;

  try {
      // 5. Capture the clone
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f3f4f6',
        windowWidth: 1280,
        width: 1280
      });

      imgData = canvas.toDataURL('image/jpeg', 0.9);
      imgProps = doc.getImageProperties(imgData);

  } finally {
      // 6. Clean up
      if (document.body.contains(clone)) {
          document.body.removeChild(clone);
      }
  }
  
  const contentStartY = margin + 10;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - contentStartY - (margin / 2);

  let imgWidth = availableWidth;
  let imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  // If height is too tall for one page, fit by height instead
  if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = (imgProps.width * imgHeight) / imgProps.height;
  }

  const x = (pageWidth - imgWidth) / 2;
  doc.addImage(imgData, 'JPEG', x, contentStartY, imgWidth, imgHeight);


  // --- LIST VIEW SECTION ---
  doc.addPage();
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 68, 103); // #254467
  doc.text('Resumen de Tareas Principales', margin, margin - 10);
  
  if (logoPngDataUrl) {
      doc.addImage(logoPngDataUrl, 'PNG', pageWidth - margin - logoWidth, margin - 35, logoWidth, logoHeight);
  }

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
  
  // --- SUBTASK MATRIX SECTION ---
  
  // Calculate start position for the next table
  let finalY = (doc as any).lastAutoTable.finalY || contentStartY;
  
  // Check if we need a new page for the matrix title
  if (finalY > pageHeight - 100) {
      doc.addPage();
      finalY = margin + 10;
  } else {
      finalY += 30; // Spacing between tables
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 68, 103);
  doc.text('Matriz de Detalles de Subtareas', margin, finalY - 10);

  // Flatten tasks to get all subtasks
  const subtaskRows: any[] = [];
  tasks.forEach(task => {
      if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach(sub => {
              subtaskRows.push([
                  task.title, // Tarea Principal
                  sub.text,   // Descripción Subtarea
                  sub.completed ? 'Completada' : 'Pendiente' // Estatus
              ]);
          });
      }
  });

  if (subtaskRows.length > 0) {
      (doc as any).autoTable({
          head: [['Tarea Principal', 'Descripción de Subtarea', 'Estatus']],
          body: subtaskRows,
          startY: finalY,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: {
              fillColor: '#254467',
              textColor: '#FFFFFF',
              fontStyle: 'bold'
          },
          columnStyles: {
              0: { cellWidth: 150, fontStyle: 'bold', textColor: 50 }, // Main Task Title
              1: { cellWidth: 'auto' },
              2: { cellWidth: 80, halign: 'center' }
          },
          styles: {
              font: 'helvetica',
              fontSize: 8,
              cellPadding: 4,
          },
          didParseCell: function(data: any) {
              // Add visual cues for status
              if (data.section === 'body' && data.column.index === 2) {
                  if (data.cell.raw === 'Completada') {
                      data.cell.styles.textColor = [46, 204, 113]; // Green
                      data.cell.styles.fontStyle = 'bold';
                  } else {
                      data.cell.styles.textColor = [231, 76, 60]; // Red
                  }
              }
          }
      });
  } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('No hay subtareas registradas en este tablero.', margin, finalY + 10);
  }


  // --- FOOTER ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(100);
  for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  doc.save(`dashboard-export-${new Date().toISOString().split('T')[0]}.pdf`);
};