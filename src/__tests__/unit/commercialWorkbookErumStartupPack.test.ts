// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { workbookCreateEditionSchema } from "@/contracts/commercialWorkbook.contract";
import { assertUniqueAddresses, parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import pack from "../../../data/commercial-workbooks/erum-summa-startup-common-math1-2022-v1.json";
import coverage from "../../../data/commercial-workbooks/erum-summa-startup-common-math1-2022-v1.coverage.json";
const parsed = workbookCreateEditionSchema.parse({ requestId: "erum-startup-official-full-review", metadata: pack.metadata, provenance: pack.provenance, exercises: pack.exercises });
// Frozen from the separately transcribed 215 source box headers and first/last numbers.
const sourceRuns: [string, number, number][] = [["14", 1, 8], ["15", 9, 16], ["16", 17, 24], ["17", 25, 32], ["18", 33, 40], ["19", 41, 48], ["20", 49, 54], ["21", 55, 62], ["22", 63, 70], ["23", 71, 78], ["24", 79, 86], ["25", 87, 94], ["26", 95, 102], ["27", 103, 110], ["28", 111, 118], ["29", 119, 124], ["30", 125, 133], ["31", 134, 141], ["32", 142, 147], ["33", 148, 155], ["34", 156, 163], ["35", 164, 171], ["36", 172, 178], ["37", 179, 184], ["38", 185, 190], ["39", 191, 196], ["43", 197, 204], ["44", 205, 212], ["45", 213, 220], ["46", 221, 228], ["47", 229, 236], ["48", 237, 243], ["49", 244, 252], ["50", 253, 258], ["51", 259, 265], ["52", 266, 269], ["53", 270, 277], ["54", 278, 284], ["55", 285, 291], ["59", 292, 299], ["60", 300, 307], ["61", 308, 315], ["62", 316, 323], ["63", 324, 331], ["64", 332, 339], ["65", 340, 347], ["66", 348, 355], ["67", 356, 361], ["68", 362, 369], ["69", 370, 376], ["70", 377, 382], ["71", 383, 388], ["72", 389, 394], ["73", 395, 402], ["77", 403, 416], ["78", 417, 428], ["79", 429, 443], ["80", 444, 456], ["81", 457, 468], ["82", 469, 480], ["83", 481, 490], ["84", 491, 500], ["85", 501, 508], ["86", 509, 516], ["87", 517, 528], ["88", 529, 540], ["89", 541, 551], ["90", 552, 559], ["91", 560, 565], ["95", 566, 573], ["96", 574, 584], ["97", 585, 596], ["98", 597, 608], ["99", 609, 620], ["100", 621, 628], ["101", 629, 634], ["102", 635, 642], ["103", 643, 646], ["104", 647, 654], ["105", 655, 664], ["106", 665, 674], ["107", 675, 682], ["108", 683, 688], ["109", 689, 698], ["110", 699, 703], ["111", 704, 713], ["112", 714, 724], ["113", 725, 736], ["114", 737, 746], ["115", 747, 752], ["119", 753, 760], ["120", 761, 770], ["121", 771, 780], ["122", 781, 786], ["123", 787, 795], ["124", 796, 803], ["125", 804, 811], ["126", 812, 821], ["127", 822, 831], ["128", 832, 837], ["129", 838, 847], ["130", 848, 855], ["131", 856, 862], ["132", 863, 870], ["133", 871, 878], ["134", 879, 887], ["135", 888, 891], ["136", 892, 895], ["137", 896, 901], ["141", 902, 911], ["142", 912, 919], ["143", 920, 926], ["144", 927, 934], ["145", 935, 944], ["146", 945, 949], ["147", 950, 955], ["148", 956, 965], ["149", 966, 973], ["150", 974, 982], ["151", 983, 988], ["152", 989, 998], ["153", 999, 1004], ["157", 1005, 1012], ["158", 1013, 1020], ["159", 1021, 1026], ["160", 1027, 1033], ["161", 1034, 1039], ["162", 1040, 1047], ["163", 1048, 1053], ["164", 1054, 1057], ["165", 1058, 1065], ["166", 1066, 1073], ["167", 1074, 1079], ["171", 1080, 1087], ["172", 1088, 1095], ["173", 1096, 1103], ["174", 1104, 1111], ["175", 1112, 1119], ["176", 1120, 1126], ["177", 1127, 1134], ["178", 1135, 1142], ["179", 1143, 1148], ["180", 1149, 1156], ["181", 1157, 1164], ["182", 1165, 1169], ["183", 1170, 1176], ["187", 1177, 1180], ["188", 1181, 1186], ["189", 1187, 1194], ["190", 1195, 1202], ["191", 1203, 1210], ["192", 1211, 1218], ["193", 1219, 1225], ["194", 1226, 1233], ["195", 1234, 1239], ["196", 1240, 1246], ["197", 1247, 1254], ["198", 1255, 1261], ["199", 1262, 1269], ["200", 1270, 1275], ["201", 1276, 1281], ["202", 1282, 1289], ["203", 1290, 1297], ["204", 1298, 1305], ["205", 1306, 1311], ["206", 1312, 1319], ["207", 1320, 1327], ["208", 1328, 1335], ["209", 1336, 1341], ["213", 1392, 1402], ["214", 1403, 1408], ["215", 1409, 1416], ["216", 1417, 1422], ["217", 1423, 1434], ["218", 1435, 1440], ["219", 1441, 1447], ["220", 1448, 1455], ["221", 1456, 1462], ["225", 1463, 1480], ["226", 1481, 1490], ["227", 1491, 1500], ["228", 1501, 1504], ["229", 1505, 1510], ["230", 1511, 1515], ["231", 1516, 1521], ["232", 1522, 1526], ["233", 1527, 1532], ["234", 1533, 1537], ["235", 1538, 1545], ["239", 1546, 1561], ["240", 1562, 1571], ["241", 1572, 1581], ["242", 1582, 1591], ["243", 1592, 1601], ["244", 1602, 1607], ["245", 1608, 1613], ["246", 1614, 1620], ["247", 1621, 1624], ["248", 1625, 1629], ["249", 1630, 1637], ["250", 1638, 1647], ["251", 1648, 1654], ["252", 1655, 1661], ["253", 1662, 1668], ["258", 1669, 1678], ["259", 1679, 1687], ["260", 1688, 1696], ["261", 1697, 1705], ["262", 1706, 1712], ["263", 1713, 1718], ["264", 1719, 1727], ["265", 1728, 1737], ["266", 1738, 1745], ["267", 1746, 1755], ["268", 1756, 1760]];
const at = (n: number) => parsed.exercises.find(r => Number(r.address.number) === n)!;
describe("Summa startup common math 1 complete printed answer scope", () => {
  it("strictly parses, keeps unique addresses, and exactly roundtrips all TSV rows", () => {
    const tsv = readFileSync(new URL("../../../data/commercial-workbooks/erum-summa-startup-common-math1-2022-v1.tsv", import.meta.url), "utf8");
    expect(parseWorkbookImport(tsv)).toEqual({ exercises: parsed.exercises, issues: [] });
    expect(() => assertUniqueAddresses(parsed.exercises)).not.toThrow();
    expect(parsed.exercises).toHaveLength(1710);
    expect(Object.keys(pack).sort()).toEqual(["coverage", "exercises", "id", "label", "metadata", "provenance"]);
  });
  it("covers every independently inventoried printed page and number without filling the source gap", () => {
    expect(parsed.exercises.map(r => [r.address.page,r.address.number])).toEqual(sourceRuns.flatMap(([p,f,l]) => Array.from({length:l-f+1},(_,i)=>[p,String(f+i).padStart(4,"0")])));
    expect(parsed.exercises.map(r=>Number(r.address.number))).toEqual([...Array.from({length:1341},(_,i)=>i+1),...Array.from({length:369},(_,i)=>i+1392)]);
    expect(coverage.pageGroups).toHaveLength(215);
    expect(coverage.sourceNumberingGaps).toEqual([expect.objectContaining({firstNumber:"1342",lastNumber:"1391",count:50,registered:false,reason:"not-printed-in-source",sourcePages:[90,91]})]);
    expect(coverage.counts).toMatchObject({exercises:1710,reviewedKeys:1692,nullKeys:18,unreviewedKeys:0,omittedInScopeAddresses:0});
  });
  it("keeps all 18 source solution-reference addresses with a complete null ledger", () => {
    const missing=[567,568,569,570,572,573,629,753,754,755,756,757,758,759,760,1085,1086,1087];
    expect(parsed.exercises.filter(r=>!r.key).map(r=>Number(r.address.number))).toEqual(missing);
    expect(parsed.exercises.filter(r=>!r.key).map(r=>r.address)).toEqual(coverage.nullKeyLedger.map(r=>r.address));
    expect(coverage.nullKeyLedger.every(r=>r.registered&&r.key===null&&r.reason==="solution-reference")).toBe(true);
  });
  it("preserves signs, radicals, units, conditional answers, original circles and matrices", () => {
    const examples=[[34,"A=(1/2)x³-(1/2)x²-x-3, B=x³+x²+x+2",2],[155,"③",7],[190,"9/4",9],[480,"13",20],[617,"x=(-1±sqrt(7)i)/4",27],[644,"4 cm",30],[1022,"(x,y)=(-1,0) 또는 (7/3,5/9)",61],[1038,"(x,y)=(2,1) 또는 (-2,-1) 또는 (i,3i) 또는 (-i,-3i)",64],[1399,"HTH, TTH, 8",91],[1611,"₆C₁, 6",109],[1677,"A=[[2,3,4],[3,2,7],[4,3,2]]",116],[1720,"[[-4,-6,-20],[8,12,40]]",120],[1760,"④",124]] as const;
    for(const[n,answerText,sourcePage]of examples)expect(at(n).key).toEqual({answerText,status:"reviewed",sourcePage});
  });
  it("checks every chapter boundary and numeric/choice key format across the book", () => {
    const counts=[196,95,111,163,187,149,103,75,97,165,71,83,123,92];
    expect(Object.values(coverage.counts.byChapter)).toEqual(counts);
    const chapters:Record<string,number>={};const byPage:Record<string,number>={};
    for(const r of parsed.exercises){
      const c=r.address.section.split(" / ")[0];chapters[c]=(chapters[c]??0)+1;
      expect(r.address.volume).toBe("본문");expect(r.address.subpart).toBe("");
      if(r.key){
        expect(r.key.status).toBe("reviewed");expect(r.key.answerText).not.toMatch(/[\u0000-\u001F\uFFFD⑥⑦⑧⑨⑩]|풀이 참조|\/0(?:\D|$)/);
        expect((r.key.answerText.match(/\(/g)??[]).length).toBe((r.key.answerText.match(/\)/g)??[]).length);
        expect((r.key.answerText.match(/\[/g)??[]).length).toBe((r.key.answerText.match(/\]/g)??[]).length);
        byPage[r.key.sourcePage!]=(byPage[r.key.sourcePage!]??0)+1;
      }
    }
    expect(chapters).toEqual(coverage.counts.byChapter);expect(byPage).toEqual(coverage.counts.byReviewedKeySourcePage);
    expect(parsed.exercises.filter(r=>r.key&&/^[①②③④⑤]$/.test(r.key.answerText))).toHaveLength(48);
  });
  it("freezes official PDF and all 215 reviewed boxes without claiming unknown edition details",()=>{
    expect(coverage.source).toMatchObject({sourceRelativePath:"secondary/files/erum_pdf2.pdf",pageCount:128,byteCount:19327188,sha256:"90fbfab9d0899649f8cf31417007ebebac639e154569b66eb74833e51cffd9d8"});
    expect(coverage.source.reviewedAnswerBoxes).toHaveLength(215);
    for(const b of coverage.source.reviewedAnswerBoxes)expect(b.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.metadata.edition).toContain("연도·판쇄·ISBN 미확인");expect(parsed.metadata).not.toHaveProperty("isbn");
    expect(parsed.metadata.curriculum).toBe("2022 개정");expect(parsed.provenance.reference).toBe("https://www.erumenb.com/bookdata/index.php?section=3");
    expect(parsed.provenance.description).toContain(coverage.source.sha256);
  });
});
