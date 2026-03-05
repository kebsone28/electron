import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, ImageRun, WidthType, Footer, PageNumber } from 'docx';
import { saveAs } from 'file-saver';
import type { MissionOrderData } from './missionOrderGenerator';

const formatCurrency = (n: number): string => {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
};

export const generateMissionOrderWord = async (data: MissionOrderData) => {
    // Fetch logo
    let logoData: ArrayBuffer | null = null;
    try {
        const response = await fetch('/logo-proquelec.png');
        if (response.ok) {
            logoData = await response.arrayBuffer();
        }
    } catch (e) {
        console.error("Could not load logo for Word", e);
    }

    // Header Table for Logo and Date
    const headerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: 'none' as any, size: 0, color: 'FFFFFF' },
            bottom: { style: 'none' as any, size: 0, color: 'FFFFFF' },
            left: { style: 'none' as any, size: 0, color: 'FFFFFF' },
            right: { style: 'none' as any, size: 0, color: 'FFFFFF' },
            insideHorizontal: { style: 'none' as any, size: 0, color: 'FFFFFF' },
            insideVertical: { style: 'none' as any, size: 0, color: 'FFFFFF' },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        children: [
                            logoData ? new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: logoData,
                                        transformation: { width: 140, height: 40 },
                                        type: 'png'
                                    } as any)
                                ],
                                spacing: { before: 100 }
                            }) : new Paragraph({ text: "PROQUELEC", spacing: { before: 100 } })
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                        children: [
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `Dakar, le ${data.date}`, size: 20 })
                                ],
                                alignment: AlignmentType.RIGHT,
                                spacing: { before: 200 }
                            })
                        ],
                        width: { size: 50, type: WidthType.PERCENTAGE }
                    })
                ]
            })
        ]
    });

    // Sections
    const doc = new Document({
        sections: [
            {
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    new TextRun({ text: "Page ", size: 16, color: "666666" }),
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        size: 16,
                                        color: "666666"
                                    }),
                                    new TextRun({ text: " sur ", size: 16, color: "666666" }),
                                    new TextRun({
                                        children: [PageNumber.TOTAL_PAGES],
                                        size: 16,
                                        color: "666666"
                                    }),
                                ]
                            })
                        ]
                    })
                },
                children: [
                    headerTable,
                    new Paragraph({ text: "", spacing: { after: 400 } }),

                    // Main Title
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({
                                text: `ORDRE DE MISSION N°${data.orderNumber} - PROQ`,
                                bold: true,
                                size: 32,
                                underline: {}
                            }),
                        ],
                        spacing: { after: 600 }
                    }),

                    // Personnel Table
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "N°", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: 'F1F5F9' }, margins: { top: 100, bottom: 100 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Prénoms et Noms", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: 'F1F5F9' }, margins: { top: 100, bottom: 100 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Fonction", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: 'F1F5F9' }, margins: { top: 100, bottom: 100 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Unité", bold: true, size: 20 })], alignment: AlignmentType.CENTER })], shading: { fill: 'F1F5F9' }, margins: { top: 100, bottom: 100 } }),
                                ],
                            }),
                            ...data.members.map((m, i) => new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: (i + 1).toString(), size: 18 })], alignment: AlignmentType.CENTER })], margins: { top: 80, bottom: 80 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.name, size: 18 })] })], margins: { top: 80, bottom: 80, left: 100 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.role, size: 18 })] })], margins: { top: 80, bottom: 80, left: 100 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.unit, size: 18 })] })], margins: { top: 80, bottom: 80, left: 100 } }),
                                ],
                            })),
                        ]
                    }),

                    new Paragraph({
                        children: [new TextRun({ text: "Sont autorisés à se rendre en mission :", bold: true })],
                        spacing: { before: 200, after: 100 }
                    }),

                    ...[
                        ["Pays ou Région", `: ${data.region}`, "Date", `: ${data.startDate}`],
                        ["Itinéraire Aller", `: ${data.itineraryAller}`],
                        ["Objet de la mission", `: ${data.purpose}`],
                        ["Moyen de transport", `: ${data.transport}`],
                        ["Itinéraire Retour", `: ${data.itineraryRetour}`],
                        ["Leur retour est prévu le", `: ${data.endDate || 'À préciser'}`],
                    ].map(d => new Paragraph({
                        children: [
                            new TextRun({ text: d[0], bold: true }),
                            new TextRun({ text: ` ${d[1]}` }),
                            ...(d[2] ? [
                                new TextRun({ text: `\t${d[2]}`, bold: true }),
                                new TextRun({ text: ` ${d[3]}` })
                            ] : [])
                        ],
                        spacing: { before: 80 }
                    })),

                    new Paragraph({ text: "", spacing: { after: 300 } }),
                    new Paragraph({
                        children: [new TextRun({
                            text: "Le présent ordre de mission devra être présenté pour certification et restitué au Responsable Administratif & Financier par les intéressés dès leur retour.",
                            italics: true,
                            size: 18,
                            color: "666666"
                        })],
                        spacing: { before: 200 }
                    }),

                    new Paragraph({ text: "", spacing: { after: 600 } }),
                    new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [new TextRun({ text: "Le Directeur Général", bold: true })],
                        spacing: { after: 100 }
                    }),

                    // DECOMPTE PAGE
                    new Paragraph({ text: "", pageBreakBefore: true }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({ text: "DECOMPTE FRAIS DE MISSION", bold: true, size: 28 })
                        ],
                        spacing: { after: 400 }
                    }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: `(${data.purpose})`, size: 20 })],
                        spacing: { after: 600 }
                    }),

                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: "Bénéficiaire", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
                                        shading: { fill: '4338CA' },
                                        margins: { top: 120, bottom: 120 }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: "Indemnité J.", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
                                        shading: { fill: '4338CA' },
                                        margins: { top: 120, bottom: 120 }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: "Jours", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
                                        shading: { fill: '4338CA' },
                                        margins: { top: 120, bottom: 120 }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: "Total", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
                                        shading: { fill: '4338CA' },
                                        margins: { top: 120, bottom: 120 }
                                    }),
                                ],
                            }),
                            ...data.members.map(m => new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.name, size: 18 })] })], margins: { top: 100, bottom: 100, left: 100 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(m.dailyIndemnity), size: 18 })], alignment: AlignmentType.RIGHT })], margins: { top: 100, bottom: 100, right: 100 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: m.days.toString(), size: 18 })], alignment: AlignmentType.CENTER })], margins: { top: 100, bottom: 100 } }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: formatCurrency(m.dailyIndemnity * m.days), size: 18 })], alignment: AlignmentType.RIGHT })], margins: { top: 100, bottom: 100, right: 100 } }),
                                ],
                            })),
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: "MONTANT TOTAL FCFA", bold: true, size: 20 })], alignment: AlignmentType.RIGHT })],
                                        columnSpan: 3,
                                        margins: { top: 120, bottom: 120, right: 200 },
                                        shading: { fill: 'F8FAFC' }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({
                                            children: [new TextRun({
                                                text: formatCurrency(data.members.reduce((sum, m) => sum + (m.dailyIndemnity * m.days), 0)),
                                                bold: true,
                                                size: 22,
                                                color: '4338CA'
                                            })],
                                            alignment: AlignmentType.RIGHT
                                        })],
                                        shading: { fill: 'F1F5F9' },
                                        margins: { top: 120, bottom: 120, right: 100 }
                                    }),
                                ]
                            })
                        ]
                    }),

                    // PLANNING PAGE
                    new Paragraph({ text: "", pageBreakBefore: true }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                            new TextRun({ text: "PLANNING DÉTAILLÉ DES ACTIVITÉS", bold: true, size: 24, color: "FFFFFF" })
                        ],
                        shading: { fill: "4338CA" },
                        spacing: { before: 200, after: 400 }
                    }),

                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: "JOUR", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
                                        shading: { fill: '1E293B' },
                                        width: { size: 20, type: WidthType.PERCENTAGE },
                                        margins: { top: 120, bottom: 120 }
                                    }),
                                    new TableCell({
                                        children: [new Paragraph({ children: [new TextRun({ text: "DESCRIPTION DÉTAILLÉE DE L'ACTIVITÉ", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
                                        shading: { fill: '1E293B' },
                                        width: { size: 80, type: WidthType.PERCENTAGE },
                                        margins: { top: 120, bottom: 120 }
                                    }),
                                ],
                            }),
                            ...data.planning.map(step => {
                                const parts = step.split('\n');
                                const title = parts[0];
                                const details = parts.slice(1).join('\n');

                                return new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph({
                                                children: [new TextRun({ text: title, bold: true, color: "4338CA", size: 18 })],
                                                alignment: AlignmentType.CENTER
                                            })],
                                            verticalAlign: AlignmentType.CENTER,
                                            margins: { top: 150, bottom: 150 },
                                            shading: { fill: 'F8FAFC' }
                                        }),
                                        new TableCell({
                                            children: details.split('\n')
                                                .map(line => line.trim())
                                                .filter(line => line.length > 0)
                                                .map(line => {
                                                    // Nettoyer les puces existantes pour éviter les doublons
                                                    const cleanLine = line.replace(/^[•\-\*\s]+/, "");
                                                    return new Paragraph({
                                                        children: [new TextRun({ text: cleanLine, size: 18 })],
                                                        spacing: { after: 120, before: 120 },
                                                        bullet: { level: 0 },
                                                        indent: { left: 240 }
                                                    });
                                                }),
                                            margins: { top: 120, bottom: 80, left: 150, right: 150 }
                                        }),
                                    ],
                                });
                            })
                        ]
                    })
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Ordre_Mission_${data.orderNumber.replace('/', '-')}.docx`);
};

export const generateMissionReportWord = async (data: MissionOrderData) => {
    const completed = data.reportDays?.filter(d => d.isCompleted).length || 0;
    const total = data.reportDays?.length || 0;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const doc = new Document({
        sections: [{
            footers: {
                default: new Footer({
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Rapport d'Exécution de Mission - PROQUELEC", size: 16, italics: true })] })]
                })
            },
            children: [
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: "RAPPORT DE FIN DE MISSION", bold: true, size: 36, color: "1E293B" })]
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `Réf: Mission N°${data.orderNumber}`, color: "64748B", size: 24 })],
                    spacing: { after: 400 }
                }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "OBJET DE LA MISSION", bold: true, size: 20 })] })], shading: { fill: "F1F5F9" }, margins: { left: 100, top: 100, bottom: 100 } }),
                                new TableCell({ children: [new Paragraph({ text: data.purpose })], margins: { left: 100, top: 100, bottom: 100 } })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TAUX DE RÉUSSITE", bold: true, size: 20 })] })], shading: { fill: "F1F5F9" }, margins: { left: 100, top: 100, bottom: 100 } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${pct}% (${completed}/${total} tâches validées)`, bold: true, color: pct > 80 ? "16A34A" : "DC2626" })] })], margins: { left: 100, top: 100, bottom: 100 } })
                            ]
                        })
                    ]
                }),

                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({ children: [new TextRun({ text: "DÉTAILS DE L'EXÉCUTION PAR ÉTAPE", bold: true, size: 24, underline: {} })], spacing: { after: 200 } }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "JOUR", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1E293B" } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ACTIVITÉ", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1E293B" } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "STATUT", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1E293B" } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "OBSERVATIONS", bold: true, color: "FFFFFF" })], alignment: AlignmentType.CENTER })], shading: { fill: "1E293B" } }),
                            ]
                        }),
                        ...(data.reportDays || []).map(rd => new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Jour ${rd.day}` })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rd.title, bold: true })] })], margins: { left: 50 } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rd.isCompleted ? "RÉALISÉ" : "NON FAIT", color: rd.isCompleted ? "16A34A" : "DC2626", bold: true })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rd.observation || "-", size: 18, italics: true })] })], margins: { left: 50 } }),
                            ]
                        }))
                    ]
                }),

                new Paragraph({ text: "", spacing: { before: 400 } }),
                new Paragraph({ children: [new TextRun({ text: "CONCLUSION ET RECOMMANDATIONS", bold: true, size: 24, underline: {} })], spacing: { after: 100 } }),
                new Paragraph({ text: data.reportObservations || "Rien à signaler.", spacing: { after: 600 } }),

                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: "none" as any }, bottom: { style: "none" as any }, left: { style: "none" as any }, right: { style: "none" as any }, insideVertical: { style: "none" as any } },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "Le Chef de Mission", bold: true })], alignment: AlignmentType.CENTER }),
                                        ...(data.signatureImage ? (() => {
                                            try {
                                                const binaryString = atob(data.signatureImage.split(',')[1]);
                                                const bytes = new Uint8Array(binaryString.length);
                                                for (let i = 0; i < binaryString.length; i++) {
                                                    bytes[i] = binaryString.charCodeAt(i);
                                                }
                                                return [
                                                    new Paragraph({
                                                        alignment: AlignmentType.CENTER,
                                                        children: [
                                                            new ImageRun({
                                                                data: bytes,
                                                                transformation: { width: 120, height: 60 }
                                                            } as any)
                                                        ]
                                                    })
                                                ];
                                            } catch (e) {
                                                console.error('Failed to process signature image', e);
                                                return [];
                                            }
                                        })() : [])
                                    ]
                                }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Approbation Hiérarchique", bold: true })], alignment: AlignmentType.CENTER })] }),
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: `\n\n\n\n${data.members[0]?.name}`, alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: "\n\n\n\n(Cachet & Signature)", alignment: AlignmentType.CENTER })], shading: { fill: "F8FAFC" } }),
                            ]
                        })
                    ]
                })
            ]
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Rapport_Mission_${data.orderNumber.replace('/', '-')}.docx`);
};
