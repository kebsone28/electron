import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import logger from '../utils/logger';

export interface ExportOptions {
    filename?: string;
    title: string;
    subtitle?: string;
    orientation?: 'p' | 'l';
}

export const exportToPDF = async (elementId: string, options: ExportOptions) => {
    const element = document.getElementById(elementId);
    if (!element) {
        logger.error(`Element with id ${elementId} not found`);
        return;
    }

    try {
        // Optimisation pour le rendu
        const canvas = await html2canvas(element, {
            scale: 2, // Meilleure qualité
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.getElementById(elementId);
                if (clonedElement) {
                    clonedElement.style.padding = '20px';
                    // Workaround for html2canvas not supporting oklch (Tailwind 4 default)
                    const elements = clonedElement.getElementsByTagName('*');
                    for (let i = 0; i < elements.length; i++) {
                        const el = elements[i] as HTMLElement;
                        const style = window.getComputedStyle(el);
                        // Force standard colors if oklch is detected
                        if (style.color.includes('oklch')) el.style.color = '#1e293b';
                        if (style.backgroundColor.includes('oklch')) el.style.backgroundColor = '#f8fafc';
                        if (style.borderColor.includes('oklch')) el.style.borderColor = '#e2e8f0';
                    }
                }
            }
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: options.orientation || 'p',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Header stylisé
        pdf.setFillColor(79, 70, 229); // Indigo 600
        pdf.rect(0, 0, pageWidth, 25, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PROQUELEC - Rapport d’Activités', 10, 12);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(new Date().toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }), 10, 18);

        // Body title
        pdf.setTextColor(30, 41, 59); // Slate 800
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(options.title.toUpperCase(), 10, 35);

        if (options.subtitle) {
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'italic');
            pdf.text(options.subtitle, 10, 41);
        }

        // Image content
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pageWidth - 20;
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, 'PNG', 10, 50, pdfWidth, pdfHeight);

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Ce document est généré automatiquement par la plateforme GEM SaaS PROQUELEC.', 10, pageHeight - 10);
        pdf.text('Page 1/1', pageWidth - 20, pageHeight - 10);

        pdf.save(`${options.filename || 'rapport'}_${Date.now()}.pdf`);
        return true;
    } catch (error) {
        logger.error('Export error:', error);
        return false;
    }
};
