import type { ComponentProps, ReactNode } from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { GradesheetInput, GradesheetSemester } from "./types";
import { fmtDate, fmtGpa, fmtMarks, fmtPercent, fmtPoints, fmtTimestamp, gradeColor } from "./format";
import { C, Mark, SgpaChart } from "./parts";

const PX = 36;
const TOP = 58;
const BOLD = "Helvetica-Bold";

const s = StyleSheet.create({
  page: { paddingTop: TOP, paddingBottom: 56, paddingHorizontal: PX, backgroundColor: "#FFFFFF", fontFamily: "Helvetica", fontSize: 9, color: C.ink },
  // slim repeating header
  slim: { position: "absolute", top: 0, left: 0, right: 0, height: 34, paddingHorizontal: PX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1.5, borderBottomColor: C.gold },
  slimBrand: { flexDirection: "row", alignItems: "center" },
  slimText: { color: "#FFFFFF", fontFamily: BOLD, fontSize: 9, marginLeft: 6, letterSpacing: 0.3 },
  slimRight: { color: "#94A3B8", fontSize: 8 },
  // hero band
  band: { marginTop: -TOP, marginHorizontal: -PX, paddingHorizontal: PX, paddingTop: 26, paddingBottom: 22, backgroundColor: C.navy, borderBottomWidth: 2.5, borderBottomColor: C.gold },
  bandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center" },
  wordmark: { flexDirection: "row", marginLeft: 9, fontFamily: BOLD, fontSize: 15, letterSpacing: -0.4 },
  eyebrow: { color: C.cyan, fontFamily: BOLD, fontSize: 7.5, letterSpacing: 2, textTransform: "uppercase", textAlign: "right" },
  title: { color: "#FFFFFF", fontFamily: BOLD, fontSize: 30, letterSpacing: -0.8, marginTop: 20 },
  subtitle: { color: "#94A3B8", fontSize: 9.5, marginTop: 4 },
  // student block
  student: { flexDirection: "row", marginTop: 16, marginBottom: 14, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 12 },
  stuLeft: { flex: 1.3, paddingRight: 10 },
  stuName: { fontFamily: BOLD, fontSize: 15, letterSpacing: -0.3 },
  stuSub: { color: C.muted, fontSize: 9, marginTop: 3 },
  stuRight: { flex: 1, borderLeftWidth: 1, borderLeftColor: C.line, paddingLeft: 12 },
  kv: { flexDirection: "row", marginBottom: 3 },
  k: { width: 62, color: C.faint, fontSize: 7.5, letterSpacing: 0.8, textTransform: "uppercase", paddingTop: 1 },
  v: { flex: 1, fontSize: 9 },
  // semester
  sem: { marginBottom: 14, borderWidth: 1, borderColor: C.line, borderRadius: 4, overflow: "hidden" },
  semHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: C.navy2, paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 1.5, borderBottomColor: C.blue },
  semTitle: { color: "#FFFFFF", fontFamily: BOLD, fontSize: 11 },
  semMeta: { color: "#93C5FD", fontSize: 8 },
  tr: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 4.5, paddingHorizontal: 10 },
  th: { backgroundColor: "#E8EEF7", paddingVertical: 4 },
  thText: { color: C.muted, fontFamily: BOLD, fontSize: 7, letterSpacing: 0.9, textTransform: "uppercase" },
  cCode: { width: 50, color: C.muted, fontSize: 8 },
  cName: { flex: 1, paddingRight: 8 },
  cFull: { width: 46, textAlign: "right" },
  cObt: { width: 52, textAlign: "right" },
  cPct: { width: 44, textAlign: "right" },
  cGrade: { width: 42, textAlign: "center" },
  cPts: { width: 40, textAlign: "right" },
  elective: { color: C.blue, fontFamily: BOLD, fontSize: 6.5, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 1.5 },
  foot: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#EAF1FE", borderTopWidth: 1, borderTopColor: "#BFD3F8" },
  sgpaBox: { width: 82, backgroundColor: C.blue, borderRadius: 3, paddingVertical: 3, alignItems: "center" },
  // summary
  sumTitle: { fontFamily: BOLD, fontSize: 18, letterSpacing: -0.5 },
  rule: { height: 2, width: 36, backgroundColor: C.gold, marginTop: 5, marginBottom: 12 },
  cgpaCard: { flexDirection: "row", alignItems: "center", backgroundColor: C.navy, borderRadius: 5, padding: 16, marginBottom: 14, borderLeftWidth: 5, borderLeftColor: C.cyan },
  cgpaNum: { color: "#FFFFFF", fontFamily: BOLD, fontSize: 46, letterSpacing: -2 },
  label: { color: C.faint, fontSize: 7.5, letterSpacing: 1, textTransform: "uppercase", fontFamily: BOLD },
  panel: { borderWidth: 1, borderColor: C.line, borderRadius: 4, padding: 12, marginBottom: 14 },
  // footer
  footer: { position: "absolute", bottom: 20, left: PX, right: PX, borderTopWidth: 0.75, borderTopColor: C.line, paddingTop: 6, flexDirection: "row", justifyContent: "space-between" },
  footText: { color: C.faint, fontSize: 6.8, lineHeight: 1.35 },
});

function Row({ i, children, style }: { i: number; children: ReactNode; style?: ComponentProps<typeof View>["style"] }) {
  return (
    <View style={[s.tr, { backgroundColor: i % 2 === 1 ? C.zebra : "#FFFFFF" }, style]} wrap={false}>
      {children}
    </View>
  );
}

function Semester({ sem }: { sem: GradesheetSemester }) {
  const electives = sem.subjects.filter((x) => x.electiveGroup).length;
  const n = sem.subjects.length;
  return (
    <View style={s.sem} wrap={false}>
      <View style={s.semHead}>
        <Text style={s.semTitle}>{`Semester ${sem.number}`}</Text>
        <Text style={s.semMeta}>{`${n} subject${n === 1 ? "" : "s"}${electives ? ` · ${electives} elective${electives === 1 ? "" : "s"}` : ""}`}</Text>
      </View>
      <View style={[s.tr, s.th]}>
        <Text style={[s.thText, s.cCode]}>Code</Text>
        <Text style={[s.thText, s.cName]}>Subject</Text>
        <Text style={[s.thText, s.cFull]}>Full marks</Text>
        <Text style={[s.thText, s.cObt]}>Obtained</Text>
        <Text style={[s.thText, s.cPct]}>%</Text>
        <Text style={[s.thText, s.cGrade]}>Grade</Text>
        <Text style={[s.thText, s.cPts]}>Points</Text>
      </View>
      {sem.subjects.map((x, i) => (
        <Row key={`${x.code ?? ""}-${i}`} i={i}>
          <Text style={s.cCode}>{x.code ?? "-"}</Text>
          <View style={s.cName}>
            <Text>{x.name}</Text>
            {x.electiveGroup ? <Text style={s.elective}>{x.electiveGroup}</Text> : null}
          </View>
          <Text style={s.cFull}>{fmtMarks(x.fullMarks)}</Text>
          <Text style={s.cObt}>{fmtMarks(x.obtained)}</Text>
          <Text style={s.cPct}>{fmtPercent(x.percent)}</Text>
          <Text style={[s.cGrade, { fontFamily: BOLD, color: gradeColor(x.grade) }]}>{x.grade}</Text>
          <Text style={s.cPts}>{fmtPoints(x.points)}</Text>
        </Row>
      ))}
      <View style={s.foot} wrap={false}>
        <Text style={[s.cCode, { fontFamily: BOLD, color: C.ink }]}>Total</Text>
        <Text style={[s.cName, { fontFamily: BOLD, fontSize: 8.5 }]}>{`Semester ${sem.number}`}</Text>
        <Text style={[s.cFull, { fontFamily: BOLD }]}>{fmtMarks(sem.totalFullMarks)}</Text>
        <Text style={[s.cObt, { fontFamily: BOLD }]}>{fmtMarks(sem.totalObtained)}</Text>
        <Text style={[s.cPct, { fontFamily: BOLD }]}>{fmtPercent(sem.percent)}</Text>
        <View style={s.sgpaBox}>
          <Text style={{ color: "#FFFFFF", fontFamily: BOLD, fontSize: 9 }}>{`SGPA ${fmtGpa(sem.sgpa)}`}</Text>
        </View>
      </View>
    </View>
  );
}

export function GradesheetDocument({ input }: { input: GradesheetInput }) {
  const { student, scale } = input;
  const sorted = input.semesters.filter((x) => x.subjects.length > 0).sort((a, b) => a.number - b.number);
  const maxPoints = scale.length ? Math.max(...scale.map((r) => r.points)) : 4;
  const weighting = input.weightMode === "credits" ? "by credits" : "by marks";
  const disclaimer = "Unofficial gradesheet generated by IOE Connect from marks entered by the student. Not an official Tribhuvan University / IOE document.";
  const totalSubjects = sorted.reduce((n, x) => n + x.subjects.length, 0);
  const rows: [string, string][] = [["Program", student.program]];
  if (student.campus) rows.push(["Campus", student.campus]);
  rows.push(["Generated", fmtDate(input.generatedAt)], ["Weighting", weighting]);
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

  return (
    <Document title={`IOE Connect Gradesheet - ${student.name}`} author="IOE Connect" subject="Unofficial gradesheet" creator="IOE Connect">
      <Page size="A4" style={s.page}>
        <View
          fixed
          style={s.slim}
          render={({ pageNumber }) =>
            pageNumber > 1 ? (
              <>
                <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.navy }} />
                <View style={s.slimBrand}>
                  <Mark size={18} />
                  <Text style={s.slimText}>IOE Connect · Gradesheet</Text>
                </View>
                <Text style={s.slimRight}>{student.name}</Text>
              </>
            ) : null
          }
        />

        <View style={s.band}>
          <View style={s.bandRow}>
            <View style={s.brand}>
              <Mark size={32} />
              <View style={s.wordmark}>
                <Text style={{ color: "#FFFFFF" }}>IOE </Text>
                <Text style={{ color: "#60A5FA" }}>Connect</Text>
              </View>
            </View>
            <Text style={s.eyebrow}>Academic record</Text>
          </View>
          <Text style={s.title}>Gradesheet</Text>
          <Text style={s.subtitle}>{`${plural(sorted.length, "semester")} · ${plural(totalSubjects, "subject")} · weighted ${weighting}`}</Text>
        </View>

        <View style={s.student} wrap={false}>
          <View style={s.stuLeft}>
            <Text style={s.label}>Student</Text>
            <Text style={[s.stuName, { marginTop: 4 }]}>{student.name}</Text>
            {student.email ? <Text style={s.stuSub}>{student.email}</Text> : null}
          </View>
          <View style={s.stuRight}>
            {rows.map(([k, v]) => (
              <View key={k} style={s.kv}>
                <Text style={s.k}>{k}</Text>
                <Text style={s.v}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        {sorted.map((sem) => (
          <Semester key={sem.number} sem={sem} />
        ))}

        <View wrap={false}>
          <Text style={s.sumTitle}>Summary</Text>
          <View style={s.rule} />
          <View style={s.cgpaCard}>
            <View style={{ flex: 1 }}>
              <Text style={[s.label, { color: C.cyan }]}>Cumulative GPA</Text>
              <Text style={s.cgpaNum}>{fmtGpa(input.cgpa)}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: "#94A3B8", fontSize: 8.5 }}>{`out of ${fmtPoints(maxPoints)}`}</Text>
              <Text style={{ color: "#CBD5E1", fontSize: 8.5, marginTop: 3 }}>{`${plural(sorted.length, "semester")} counted`}</Text>
              <Text style={{ color: "#CBD5E1", fontSize: 8.5, marginTop: 3 }}>{`Weighted ${weighting}`}</Text>
            </View>
          </View>
          <View style={s.panel}>
            <Text style={[s.label, { marginBottom: 6 }]}>SGPA by semester</Text>
            <SgpaChart semesters={sorted} maxPoints={maxPoints} width={495} />
          </View>
          {scale.length > 0 ? (
            <View style={s.panel}>
              <Text style={[s.label, { marginBottom: 6 }]}>Grading scale</Text>
              <View style={[s.tr, s.th, { paddingHorizontal: 6 }]}>
                <Text style={[s.thText, { width: 70 }]}>Grade</Text>
                <Text style={[s.thText, { width: 90 }]}>Points</Text>
                <Text style={[s.thText, { flex: 1 }]}>Minimum %</Text>
              </View>
              {scale.map((r, i) => (
                <Row key={r.grade} i={i} style={{ paddingHorizontal: 6, paddingVertical: 3 }}>
                  <Text style={{ width: 70, fontFamily: BOLD, color: gradeColor(r.grade) }}>{r.grade}</Text>
                  <Text style={{ width: 90 }}>{fmtPoints(r.points)}</Text>
                  <Text style={{ flex: 1 }}>{`${fmtMarks(r.minPercent)}%`}</Text>
                </Row>
              ))}
            </View>
          ) : null}
        </View>

        <View
          fixed
          style={s.footer}
          render={({ pageNumber, totalPages }: { pageNumber: number; totalPages?: number }) => (
            <>
              <Text style={[s.footText, { width: 440 }]}>{`${disclaimer}\nGenerated ${fmtTimestamp(input.generatedAt)}`}</Text>
              <Text style={[s.footText, { fontFamily: BOLD }]}>{"Page " + pageNumber + " of " + totalPages}</Text>
            </>
          )}
        />
      </Page>
    </Document>
  );
}
