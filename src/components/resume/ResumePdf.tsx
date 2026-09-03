import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type { ResumeData } from "@/lib/types";
import { FONT_MAP, getTemplate, type TemplateConfig } from "@/lib/templates";

interface PdfStyles {
  page: Style;
  summary: Style;
  summaryText: Style;
  section: Style;
  expRow: Style;
  expHeader: Style;
  eduRow: Style;
  placeholder: Style;
  sectionTitle: Style;
  expRole: Style;
  expPeriod: Style;
  expCompany: Style;
  expDesc: Style;
  eduDegree: Style;
  eduInstitution: Style;
  eduYear: Style;
  chip: Style;
  name: Style;
  jobTitle: Style;
  main: Style;
  sidebar?: Style;
  contactBlock?: Style;
  contactLine?: Style;
  contactLabel?: Style;
  skillsLabel?: Style;
  header?: Style;
  chipsRow?: Style;
}

function createStyles(t: TemplateConfig): PdfStyles {
  const font = FONT_MAP[t.font];
  const s = t.fontSizeScale;
  const p = t.palette;

  const sectionTitle: Style = {
    fontSize: 11 * s,
    letterSpacing: 1.5,
    color: p.text,
    borderBottomWidth: 2,
    borderBottomColor: p.accent,
    paddingBottom: 3,
    marginBottom: 10 * s,
    textTransform: "uppercase",
    fontFamily: font.pdfBold,
  };

  const chip: Style = {
    marginBottom: 5,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: p.chipBorder,
    borderRadius: 10,
    fontSize: 8 * s,
    alignSelf: "flex-start",
    backgroundColor: p.chipBg,
    color: p.chipText,
  };

  const expRole: Style = {
    fontSize: 10.5 * s,
    fontFamily: font.pdfBold,
    color: p.text,
  };
  const expPeriod: Style = { fontSize: 8.5 * s, color: p.muted };
  const expCompany: Style = { fontSize: 9.5 * s, color: p.accent, marginTop: 1 };
  const expDesc: Style = { fontSize: 9 * s, lineHeight: 1.55, marginTop: 4, color: p.text };
  const eduDegree: Style = { fontSize: 10.5 * s, fontFamily: font.pdfBold, color: p.text };
  const eduInstitution: Style = { fontSize: 9.5 * s, color: p.accent, marginTop: 1 };
  const eduYear: Style = { fontSize: 9 * s, color: p.muted, marginTop: 1 };

  const base: Record<string, Style> = {
    page: {
      width: "100%",
      backgroundColor: p.paper,
      color: p.text,
      fontFamily: font.pdf,
    },
    summary: { marginBottom: 18 * s },
    summaryText: { fontSize: 10 * s, lineHeight: 1.6, color: p.text },
    section: { marginBottom: 18 * s },
    expRow: { marginBottom: 10 * s },
    expHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
    eduRow: { marginBottom: 8 * s },
    placeholder: { fontSize: 10 * s, color: p.muted, fontStyle: "italic" },
  };

  if (t.layout === "sidebar") {
    return StyleSheet.create({
      ...base,
      page: { ...base.page, flexDirection: "row" },
      sidebar: {
        width: "34%",
        backgroundColor: p.headerBg,
        color: p.headerText,
        paddingTop: 40,
        paddingBottom: 40,
        paddingLeft: 24,
        paddingRight: 24,
      },
      name: { fontSize: 20, fontFamily: font.pdfBold, lineHeight: 1.2, color: p.headerText },
      jobTitle: { marginTop: 4, fontSize: 11, color: p.headerAccent },
      contactBlock: { marginTop: 20 },
      contactLine: { fontSize: 9, lineHeight: 1.5, color: p.headerText },
      contactLabel: { color: p.headerAccent, fontFamily: font.pdfBold },
      skillsLabel: {
        marginTop: 20,
        marginBottom: 10,
        fontSize: 9,
        letterSpacing: 1.5,
        color: p.headerAccent,
        textTransform: "uppercase",
        fontFamily: font.pdfBold,
      },
      chip,
      main: { flex: 1, paddingTop: 40, paddingBottom: 40, paddingLeft: 26, paddingRight: 26 },
      sectionTitle,
      expRole,
      expPeriod,
      expCompany,
      expDesc,
      eduDegree,
      eduInstitution,
      eduYear,
    }) as PdfStyles;
  }

  return StyleSheet.create({
    ...base,
    page: { ...base.page, flexDirection: "column" },
    header: {
      backgroundColor: p.headerBg,
      paddingTop: 30,
      paddingBottom: 22,
      paddingLeft: 34,
      paddingRight: 34,
    },
    name: { fontSize: 22, fontFamily: font.pdfBold, lineHeight: 1.2, color: p.headerText },
    jobTitle: { marginTop: 4, fontSize: 11, color: p.headerAccent },
    contactLine: { marginTop: 8, fontSize: 9, color: p.headerAccent },
    main: { flex: 1, paddingTop: 24, paddingBottom: 34, paddingLeft: 34, paddingRight: 34 },
    sectionTitle,
    chipsRow: { flexDirection: "row", flexWrap: "wrap" },
    chip: { ...chip, marginRight: 6 },
    expRole,
    expPeriod,
    expCompany,
    expDesc,
    eduDegree,
    eduInstitution,
    eduYear,
  }) as PdfStyles;
}

export function ResumePdf({ data }: { data: ResumeData }) {
  const t = getTemplate(data.templateId);
  const styles = createStyles(t);
  const contactItems = [data.email, data.phone, data.city, data.linkedin].filter(Boolean);

  const body = (
    <>
      <View style={styles.summary}>
        <Text style={styles.sectionTitle}>Resumo Profissional</Text>
        {data.summary ? (
          <Text style={styles.summaryText}>{data.summary}</Text>
        ) : (
          <Text style={styles.placeholder}>Escreva um breve resumo profissional...</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experiência Profissional</Text>
        {data.experiences.length === 0 && (
          <Text style={styles.placeholder}>Adicione suas experiências...</Text>
        )}
        {data.experiences.map((exp) => (
          <View key={exp.id} style={styles.expRow}>
            <View style={styles.expHeader}>
              <Text style={styles.expRole}>{exp.role}</Text>
              <Text style={styles.expPeriod}>{exp.period}</Text>
            </View>
            <Text style={styles.expCompany}>{exp.company}</Text>
            {exp.description && <Text style={styles.expDesc}>{exp.description}</Text>}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Formação Acadêmica</Text>
        {data.education.length === 0 && (
          <Text style={styles.placeholder}>Adicione sua formação...</Text>
        )}
        {data.education.map((edu) => (
          <View key={edu.id} style={styles.eduRow}>
            <Text style={styles.eduDegree}>{edu.degree}</Text>
            <Text style={styles.eduInstitution}>{edu.institution}</Text>
            {edu.year && <Text style={styles.eduYear}>{edu.year}</Text>}
          </View>
        ))}
      </View>

      {data.certifications.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Certificações</Text>
          <View style={styles.chipsRow}>
            {data.certifications.map((cert) => (
              <Text key={cert} style={styles.chip}>
                {cert}
              </Text>
            ))}
          </View>
        </View>
      )}

      {data.languages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Idiomas</Text>
          <View style={styles.chipsRow}>
            {data.languages.map((lang) => (
              <Text key={lang} style={styles.chip}>
                {lang}
              </Text>
            ))}
          </View>
        </View>
      )}
    </>
  );

  return (
    <Document
      title={`Currículo - ${data.fullName || "Candidato"}`}
      author={data.fullName || "eCurrículo Digital"}
      creator="eCurrículo Digital"
    >
      <Page size="A4" style={styles.page}>
        {t.layout === "sidebar" ? (
          <>
            <View style={styles.sidebar}>
              <Text style={styles.name}>{data.fullName || "Seu Nome Completo"}</Text>
              <Text style={styles.jobTitle}>{data.jobTitle || "Seu Cargo Desejado"}</Text>

              {(data.email || data.phone || data.city || data.linkedin) && (
                <View style={styles.contactBlock}>
                  {data.email && (
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLabel}>Email: </Text>
                      {data.email}
                    </Text>
                  )}
                  {data.phone && (
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLabel}>Telefone: </Text>
                      {data.phone}
                    </Text>
                  )}
                  {data.city && (
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLabel}>Localização: </Text>
                      {data.city}
                    </Text>
                  )}
                  {data.linkedin && (
                    <Text style={styles.contactLine}>
                      <Text style={styles.contactLabel}>LinkedIn: </Text>
                      {data.linkedin}
                    </Text>
                  )}
                </View>
              )}

              {data.skills.length > 0 && (
                <View>
                  <Text style={styles.skillsLabel}>Habilidades</Text>
                  {data.skills.map((skill) => (
                    <Text key={skill} style={styles.chip}>
                      {skill}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.main}>{body}</View>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.name}>{data.fullName || "Seu Nome Completo"}</Text>
              <Text style={styles.jobTitle}>{data.jobTitle || "Seu Cargo Desejado"}</Text>
              {contactItems.length > 0 && (
                <Text style={styles.contactLine}>{contactItems.join("  •  ")}</Text>
              )}
              {data.skills.length > 0 && (
                <View style={{ ...styles.chipsRow, marginTop: 12 }}>
                  {data.skills.map((skill) => (
                    <Text key={skill} style={styles.chip}>
                      {skill}
                    </Text>
                  ))}
                </View>
              )}
            </View>
            <View style={styles.main}>{body}</View>
          </>
        )}
      </Page>
    </Document>
  );
}