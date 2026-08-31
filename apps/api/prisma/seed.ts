import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function resolveSeedPassword(envName: string, devDefault: string): string {
  if (process.env[envName]) {
    return process.env[envName]!;
  }

  if (process.env.NODE_ENV === "production") {
    return crypto.randomBytes(18).toString("base64url");
  }

  return devDefault;
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
    throw new Error(
      "Seed is blocked in production. Set ALLOW_SEED=true only for intentional bootstrap runs."
    );
  }

  const adminPlainPassword = resolveSeedPassword("SEED_ADMIN_PASSWORD", "admin1234");
  const studentPlainPassword = resolveSeedPassword("SEED_STUDENT_PASSWORD", "student1234");

  // Clear existing data
  await prisma.rubricScore.deleteMany();
  await prisma.scenarioResponse.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash(adminPlainPassword, 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@becomebetter.ro",
      fullName: "Become Better Admin",
      role: UserRole.ADMIN,
      passwordHash: adminPassword,
    },
  });

  // Create student user
  const studentPassword = await bcrypt.hash(studentPlainPassword, 10);
  const student = await prisma.user.create({
    data: {
      email: "student@becomebetter.ro",
      fullName: "John Student",
      role: UserRole.STUDENT,
      passwordHash: studentPassword,
    },
  });

  // Default evaluation rubrics for PDCA Toyota Kata
  const pdcaRubrics = [
    {
      name: "P (PLAN) - Obstacol & Cauză (CE & CARE?)",
      description:
        "Definirea precisă a obstacolului (unde/cum se pierde ceva în proces față de Starea Țintă, fără soluții mascate sau concluzii pripite) și identificarea cauzei rădăcină prin 'Du-te și vezi' (Go & See).",
    },
    {
      name: "P (PLAN) - Pasul Următor & Tipologie",
      description:
        "Formularea unui pas mic, rapid și specific. Clasificarea clară a pasului în unul din cele 3 tipuri: 1) Du-te și vezi; 2) Experiment explorator; 3) Testarea unei ipoteze.",
    },
    {
      name: "P (PLAN) - Așteptări & Predicție Cuantificabilă",
      description:
        "Formularea unei predicții numerice/cuantificabile ÎNAINTE de experiment (# pași reduși, # mișcări, timp în secunde, număr defecte) care poate fi comparată 1:1 la Check.",
    },
    {
      name: "D & C (DO & CHECK) - Execuție Rapidă & Rezultat Observat Direct",
      description:
        "Execuția pe termen scurt fără întreruperea procesului și înregistrarea faptelor observate direct (fără opinii/presupuneri), realizând o comparație mecanică 1:1 între Așteptări și Rezultat.",
    },
    {
      name: "A (ACT) - Învățare Științifică & Evitarea Greșelilor",
      description:
        "Extragerea 'informațiilor utile' (useful information) din abateri/surprize, stabilizarea ce a funcționat sau construirea unei noi ipoteze, evitând cele 7 greșeli comune (sărit la soluții, pași prea mari, predicție reconstruită etc.).",
    },
  ];

  const courseTheoryText = `
# 🌀 PDCA Toyota Kata - Gândire Științifică și Experimentare Rapidă

PDCA-ul din **Toyota Kata** este un instrument de gândire științifică și navigare prin incertitudine, de experimentare mecanică, rapidă și repetată.
Spre deosebire de PDCA-ul clasic care pornește de la o problemă și caută o soluție statică, **PDCA Kata** pornește de la o **Stare Țintă** și recunoaște explicit incertitudinea: *"Nu știu exact ce trebuie să fac, rulate experimente mici și rapide ca să aflu, și mă aștept să fiu surprins."*

---

## 📋 Structura celor 4 Faze PDCA în Kata

### 1. P (PLAN) - Procedură în 4 pași:
1. **Obstacol (CE?):** Un obstacol este întotdeauna o descriere a locului/modului în care pierdem ceva în proces în comparație cu indicatorul din starea țintă (ex. *"Pierdem timp pentru așteptarea în secvența X"*, *"Pierdem calitate la piesa Y"*). **Nu include soluția în formulare!**
2. **Cauză (CARE?):** Analiza cauzei principale prin observație directă (*"Du-te și vezi"*). Deming a spus: *"Dacă cauzele sunt foarte clare, contramăsura va fi ușor de găsit"*. Nu încurca obstacolul cu cauza!
3. **Pasul următor:** Definește pasul rapid pentru azi/mâine. Cele 3 tipuri de pas:
   - **Du-te și vezi:** Observare și colectare date, fără a schimba nimic.
   - **Experiment explorator:** Introducerea unei schimbări pentru a vedea cum reacționează procesul.
   - **Testarea unei ipoteze:** Introducerea unei schimbări (ideal un singur factor) cu o predicție exactă.
4. **Așteptări (Predicție):** Ce rezultat te aștepți să obții? (număr de pași reduși, timp de execuție scos, reducerea defectelor). Predicția se scrie **ÎNAINTE** de experiment.

---

### 2. D (DO) - Testarea ipotezei:
- Execută pasul planificat.
- Orizont scurt de timp (cicluri zilnice / 24h).
- Observă! Nu întrerupe procesul. Urmărește datele în același mod în care le-ai analizat.

---

### 3. C (CHECK) - Comparare 1:1:
- Notează rezultatul obținut prin **observare directă** (fapte reale, nu opinii).
- Realizează o comparație mecanică **1:1** între **Așteptări (Predicție)** și **Rezultatul Real**.

---

### 4. A (ACT / LEARNING) - Învățare Științifică:
- **Ce am învățat?** În Toyota Kata, un experiment care nu confirmă ipoteza NU este un eșec. Este **"informație utilă" (useful information)** care îți arată că înțelegerea ta despre sistem era diferită.
- **Ce a funcționat:** Standardizați și stabilizați.
- **Ce NU a funcționat:** Construiți o nouă ipoteză și treceți la următorul pas.

---

## ⚠️ Cele 7 Greșeli Comune (De Evitat):
1. **Sare la soluții:** Propune direct o acțiune/echipament fără să treacă prin *Obstacol -> Cauză -> Predicție -> Experiment*.
2. **Pași prea mari:** Experimentul durează săptămâni/luni, eliminând posibilitatea de învățare rapidă.
3. **Predicție reconstruită ulterior:** Scrie ce s-a întâmplat, apoi "adaptează" predicția din urmă.
4. **Confundă opinia cu observația:** Raportează păreri la Check în loc de fapte văzute direct.
5. **Ignoră surprizele:** Trecerea cu vederea a unui rezultat neașteptat în loc de utilizarea lui ca sursă de învățare.
6. **Rezolvă mai multe obstacole deodată:** Pierde capacitatea de a lega o cauză de un efect.
7. **Nu închide ciclul:** Sare la pasul următor fără a documenta Check/Act pe cel anterior.
`;

  // Create Master PDCA Course
  const course = await prisma.course.create({
    data: {
      title: "PDCA Toyota Kata - Gândire Științifică și Experimentare Rapidă",
      description:
        "Stăpânește metodologia PDCA Toyota Kata pentru rezolvarea științifică a problemelor în procese industriale și operaționale.\n\n## Ce vei învăța:\n- Formularea riguroasă a Obstacolelor și Cauzelor fără a sări la soluții\n- Clasificarea celor 3 tipuri de pas (Du-te și vezi, Explorator, Testare Ipoteză)\n- Formularea predicțiilor cuantificabile 1:1 înainte de execuție\n- Analiza faptelor observate direct și extragerea 'informațiilor utile' (useful information)\n- Evitarea celor 7 greșeli comune de experimentare\n\n## Format:\n- Ghid teoretic exhaustiv PDCA Kata\n- Scenarii de simulare din producție reală\n- Feedback AI riguros bazat pe criteriile Toyota Kata",
      theory: courseTheoryText,
      evaluationCriteria: pdcaRubrics,
    },
  });

  // Scenario 1
  await prisma.scenario.create({
    data: {
      title: "Scenariul 1: Reducerea timpului de schimbare și a timpilor morți la Linia de Asamblare P-237",
      problemStatement: `Ești Improver/Inginer de Proces pe linia de asamblare P-237. 
Starea Țintă a liniei este atingerea unui timp de ciclu stabil de 45 secunde/piesa și zero timpi morți cauzați de schimbarea alimentatoarelor.
În prezent, la fiecare 2 ore linia se oprește timp de aproximativ 8-12 minute pentru că operatorul trebuie să meargă în depozitul intermediar pentru a aduce noul lot de componente C-12.

Formulează primul ciclu de experimentare PDCA Kata parcurgând riguros:
1. Obstacolul exact (CE?) și Cauza analizată prin Du-te și vezi (CARE?).
2. Pasul următor (alege și specifică tipul: Du-te și vezi / Experiment explorator / Testarea unei ipoteze).
3. Așteptările (Predicția cuantificabilă scosă înainte de testare).
4. Cât durează și cum vei face verificarea directă (Check 1:1).
5. Ce te aștepți să înveți din acest prim ciclu.`,
      coachingMaterials: `RECOMPENSĂ COACHING KATA:
- Asigură-te că NU propui direct "instalăm un cărucior automat" sau "cumpărăm rafturi noi" (greșeala #1: Sare la soluții).
- Primul pas trebuie să fie mic (ideal realizabil până mâine).
- Încadrează pasul într-unul din cele 3 tipuri (Du-te și vezi, Experiment explorator, Testarea unei ipoteze).`,
      courseId: course.id,
      ownerId: admin.id,
      visibility: "PUBLIC",
      rubrics: {
        create: pdcaRubrics,
      },
    },
  });

  // Scenario 2
  await prisma.scenario.create({
    data: {
      title: "Scenariul 2: Prevenirea defectelor de bavură la stația de prelucrare CNC",
      problemStatement: `La stația CNC-04 de prelucrare a carcaselor de aluminiu, rata de piese cu bavură pe muchia exterioară a crescut la 6% în schimbul 1. 
Starea Țintă este < 0.5% piese cu bavură.
Echipa dorește să schimbe imediat scula de așchiere și parametrii de avans ai mașinii simultan.

În calitate de practicant Kata:
1. Identifică greșelile de gândire din abordarea echipei (raportate la cele 7 greșeli comune).
2. Redefinește PLAN-ul PDCA: Obstacolul precis și cauza rădăcină (*Du-te și vezi*).
3. Propune un pas următor de tip "Du-te și vezi" sau "Testarea unei ipoteze" cu un singur factor schimbat.
4. Formulează predicția cuantificabilă (Așteptări) 1:1 și procedura de Check/Act.`,
      coachingMaterials: `RECOMPENSĂ COACHING KATA:
- Reține regula Deming: "Dacă cauzele sunt foarte clare, contramăsura va fi ușor de găsit".
- Evită schimbarea simultană a 2 factori (greșeala #6: Rezolvă mai multe obstacole deodată).`,
      courseId: course.id,
      ownerId: admin.id,
      visibility: "PUBLIC",
      rubrics: {
        create: pdcaRubrics,
      },
    },
  });

  // Scenario 3
  await prisma.scenario.create({
    data: {
      title: "Scenariul 3: Optimizarea timpului de schimbare a matriței (SMED Kata)",
      problemStatement: `Timpul de schimbare a matriței pe presa hidraulică P-500 variază între 42 minute și 68 minute. 
Starea Țintă stabilită este de 25 minute fixe.
Operatorul raportează: "Pierdem cel mai mult timp căutând cheile potrivite și șuruburile de strângere în jurul presei".

Construiește o fișă completă de experiment PDCA Kata:
1. Obstacolul (CE?) și Cauza (CARE?).
2. Definirea pasului următor cu un orizont de timp de 24h.
3. Predicția exactă în secunde/minute salvate (Așteptări).
4. Cum efectuezi Check-ul prin fapte observate direct (nu păreri) și cum analizezi rezultatul la Act dacă predicția NU se adeverește.`,
      coachingMaterials: `RECOMPENSĂ COACHING KATA:
- Nu încurca obstacolul cu cauza!
- Dacă predicția nu se confirmă la Act, în Toyota Kata aceasta reprezintă "useful information" (informație utilă) despre proces.`,
      courseId: course.id,
      ownerId: admin.id,
      visibility: "PUBLIC",
      rubrics: {
        create: pdcaRubrics,
      },
    },
  });

  console.log("✅ PDCA Toyota Kata Seed data created successfully!");
  console.log("👤 ADMIN ACCOUNT: admin@becomebetter.ro / " + adminPlainPassword);
  console.log("👤 STUDENT ACCOUNT: student@becomebetter.ro / " + studentPlainPassword);
  console.log("📚 COURSE CREATED: " + course.title);
  console.log("🎯 3 Detailed PDCA Kata Scenarios created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
