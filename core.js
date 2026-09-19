/* ============================================================================
   core.js  —  연습 포털 공용 엔진   (CORE_VERSION 2.1, 2026-09-09)

   ── v2.1 에서 더한 것 — 스캐폴딩 엔진 (문제은행 v2.0 의 엔진 절반) ──────────
     MCF.init({ scaffold: true }) 를 부른 파일에서만 켜진다. 안 부른 파일
     (U1~U6, MCF3M, MCR3U) 은 v2.0 과 한 글자도 다르지 않게 돈다.

     하는 일:
       · 학생이 **오답을 고르면** 그 자리에서 마이크로 스텝이 열린다.
         "도와줘" 버튼은 없다 — 스스로 열 수 없다 (Dan 확정 2026-09-09).
       · 고른 오답에 tag 와 step 이 달려 있으면 **그 스텝으로 직행**한다.
       · 스텝에서 또 틀리면 나노 스텝으로 내려가고, 나노가 없으면 한 문장
         힌트를 띄우고 정답을 강제로 펴 보인 뒤 다음 스텝으로 간다.
         **흐름은 어디서도 멈추지 않는다** (파이프라인 언블로킹).
       · 스캐폴딩이 한 번이라도 열린 문항은 점수가 0 이다. 구조가 그것을
         보장한다 — 스캐폴딩은 오답에서만 열리고, 오답은 그 자리에서
         확정되므로 progress.js 가 그 문항을 맞은 것으로 셀 길이 없다.
       · 스캐폴딩이 끝나면 **동형 문제**(같은 유형·같은 난이도의 새 문제)가
         나온다. 그것을 **무보조로** 맞혀야 점수가 들어간다. 동형 문제는
         평범한 새 문제라서 progress.js 의 채점 경로를 그대로 탄다.

     왜 step.mode 가 아니라 step.ask 인가:
       인계문서 §4.7 은 `step.mode: "read"|"pick"` 을 적었지만, `mode` 는
       이미 풀이 방법 탭(ps/cc/qf)이 쓰고 있는 칸이다. 거기에 "pick" 을
       넣으면 탭이 있는 유형(U4 L3)에서 스텝이 걸러져 사라진다. 그래서
       충돌이 없는 새 칸 `ask` 를 쓴다.

   ── 스텝 계약 (v2.1 추가분) ────────────────────────────────────────────────
   steps: [{
     title, math, explanation, mode, ...           // 여기까지는 v2.0 과 같다
     ask: {                                        // 있으면 마이크로 스텝
       prompt  : "이 스텝에서 묻는 것"
       options : ["A) ...","B) ...","C) ...","D) ..."]
       answer  : "A"|"B"|"C"|"D"
       hint    : "틀렸을 때 띄우는 한 문장"        // 나노가 없을 때 쓴다
       nano    : [{ prompt, options, answer, hint }]   // 선택. 두 조건일 때만
     }
   }]
   distractors: [                                  // 메인 문항의 오답 라우팅
     { value: "<보기 본문 그대로>", tag: "WRONG_BASE", step: 2 },  // step 은 1부터
     { value: "<다른 오답>",        tag: null }                    // 필러 — 라우팅 안 함
   ]
   ========================================================================== */

/* ============================================================================
   (v2.0 머리말 — 그대로 둔다)

   mcf-core.js v1 의 후계다. 학년이 늘어도 파일 이름은 core.js 하나로 고정한다.
   버전은 아래 CORE_VERSION 상수에만 적는다. 이름에 버전을 넣으면 올릴 때마다
   레슨 HTML 의 <script src> 를 전부 고쳐야 한다.

   v1 에서 달라진 것 — 재시도 엔진 (보스 전용, opt-in):
     MCF.init({ retry: true, backUrl: "..." }) 를 부른 파일에서만 켜진다.
     레거시 파일(MCF3M / MCR3U)은 이 인자를 안 주므로 v1 과 완전히 같게 돈다.
     나중에 그 코스를 올릴 때는 폴더의 mcf-core.js 를 이 파일 내용으로 갈아
     끼우고 (이름은 그대로 두고) 보스 파일에서만 retry:true 를 주면 된다.

   재시도 규칙 (누적 기준. 연속이 아니다):
     통과에 필요한 정답 수 = 그 유형에서 누적 오답 수 + 1
     오답 3회 "연달아" 이면 화면 중앙 팝업이 뜨고 진행이 멈춘다
     통과 전에는 유형 드롭다운이 잠긴다 — 다음 문제는 반드시 같은 유형이다
     오답은 그 문제에서 확정된다. 같은 문제를 다시 고를 수 없다 (시험과 같다)

   왜 있나:
     같은 엔진 코드가 레슨 파일 18개에 각각 복사돼 있었고, 복붙하는 사이에
     버전이 갈라졌다. evaluateStudentAnswer 는 18파일에 18가지, mcfPick 은
     17파일에 12가지, shuffleMC 는 4가지였다. 그래서 Unit 2 에서 고친 결함이
     Unit 4 에 없고, Unit 4 에서 고친 결함이 Unit 1 에 그대로 남았다.
     이 파일은 그 공통부를 한 곳으로 모은 것이다. 여기를 고치면 전부 고쳐진다.

   어떻게 붙이나 (레슨 HTML) — 순서가 중요하다:
       1. katex + auto-render (CDN)
       2. ../mcf-core.js          (이 파일)
       3. 인라인 문항 생성기      (끝에서 MCF.init({generate: generateProblem}) 호출)
       4. ../progress.js          (반드시 마지막)
     progress.js 가 generateNewProblem / triggerNewQuestion /
     evaluateStudentAnswer / unlockSolutionPanel / selectMcOptionCard 을
     감싸므로, 그것들이 progress.js 로드 시점에 전역에 있어야 한다.

   다른 코스(MCR3U/MHF4U)로 확장할 때:
     이 파일은 코스 지식이 없다. 문항 파일이 아래 계약대로 객체를 돌려주기만
     하면 된다. 새 자산이 필요하면 MCF.registerAsset(name, fn) 으로 등록한다.

   ── 문항 객체 계약 ──────────────────────────────────────────────────────────
   {
     title            : "Type 2: Trinomial Factoring (a = 1)"
     type             : "mc"                       // 지금은 객관식만
     assetType        : "none"|"svg"|"graph"|"table"|"tov"|"custom"
     assetHtml        : 위가 none 이 아닐 때 그릴 HTML
     optionType       : "text"|"graph"
     options          : ["A) ...","B) ...","C) ...","D) ..."]
     optionSpecs      : 그래프 보기일 때 숫자 사양 (기계 감사용)
     fullStatement    : 문제문     (innerHTML)
     prompt           : 보기 위 라벨
     hint             : 힌트       (innerHTML)
     ans              : "A"|"B"|"C"|"D"
     rawAns           : 정답 본문 (선택)
     hasMethods       : true 면 풀이 방법 토글 바를 띄운다
     methods          : [{key:"ps",label:"Product & Sum Method"}, ...]
     steps            : [{
                          title       : 단계 제목
                          math        : 수식 (렌더 시 \( \) 로 자동 래핑)
                          rule        : 규칙 줄 (선택, math-rule 로 렌더)
                          explanation : 설명문 (산문 + \( \) 조각 혼합 가능)
                          mode        : 없거나 "common" 이면 항상 보임.
                                        "ps"/"cc" 등이면 그 방법일 때만 보임
                          isMatrix    : true 면 대각선 곱 상자로 렌더
                          matrixData  : {lt,lb,rt,rb,pt,pb,sum}
                        }]
   }
   ── 수식 안전 규칙 ─────────────────────────────────────────────────────────
     설명문·문제문·힌트·보기는 innerHTML 로 들어간다. 그 안의 수식 조각은
     반드시 MCF.M() / MCF.Mu() 로 감싼다. 맨몸 \text{} 나 $...$ 는 학생 화면에
     글자로 그대로 노출된다. ($...$ 는 KaTeX 델리미터로 등록돼 있지 않다.)
   ========================================================================== */

(function (global) {
  "use strict";

  /* 레슨 파일이 폴더 위치를 몰라 ../mcf-core.js 와 mcf-core.js 를 둘 다 걸어둔다.
     둘 다 존재하면 이 파일이 두 번 실행되므로, 두 번째는 아무 일도 하지 않는다. */
  if (global.MCF && global.MCF.__version) return;

  var CORE_VERSION = "2.1";
  var MCF = { __version: CORE_VERSION };
  var state = {
    generate: null,
    problem: null,
    quiz: null,
    method: null,
    methods: [],
    steps: [],            // 현재 방법에서 보이는 단계 DOM
    stepIndex: 0,
    score: 0,
    attempts: 0,
    logUrl: null,
    unitId: "",
    lessonId: "",
    assets: {},

    /* 재시도 엔진. on:false 면 아래 코드는 한 줄도 실행되지 않는다. */
    retry: {
      on: false,
      byType: {},        // typeId -> { tries, correct, wrong, streak }
      lockedType: null,  // 통과 못한 유형. null 이면 드롭다운이 열린다
      lockedLevel: null, // 통과 못한 난이도 (보스의 A / T)
      level: "",         // 지금 고른 난이도. 빈 문자열이면 난이도를 안 쓰는 파일
      halted: false,     // 3연속 오답 팝업이 떠 있는 상태
      backUrl: "",
      backLabel: "Back to the lesson"
    },

    /* 스캐폴딩 엔진 (v2.1). on:false 면 아래 코드는 한 줄도 실행되지 않는다. */
    sc: {
      on: false,        // 이 파일이 스캐폴딩을 쓰는가 (MCF.init 의 scaffold)
      live: false,      // 지금 스캐폴딩이 열려 있는가
      list: [],         // ask 가 달린 스텝의 인덱스들 (p.steps 기준)
      at: 0,            // list 안에서 지금 몇 번째인가
      state: [],        // list 와 같은 길이. "open"|"got"|"shown"
      blind: -1,        // 처음 막힌 스텝의 인덱스. 동형 문제가 여기로 되돌린다
      nanoAt: -1,       // 나노 진행 위치. -1 이면 나노 안 열림
      nanoState: []     // 나노마다 "open"|"got"|"shown"
    },
    twin: {
      pending: false,   // 다음에 만들 문제가 동형 문제다
      active: false,    // 지금 화면의 문제가 동형 문제다
      blind: -1,        // 되돌아갈 스텝
      shape: null       // 되풀이해야 할 모양 (문항이 p.shape 로 알려 준다)
    }
  };

  /* ───────────────────────── 1. 기본 유틸 ───────────────────────── */

  /* 세 번째 인자는 뽑으면 안 되는 값들이다. Unit 2·3·4 문항이 a 계수에서 0 을
     빼려고 이걸 쓴다. 이 인자를 무시하면 a = 0 이 나와 식이 통째로 NaN 이 된다. */
  function randInt(min, max, exclude) {
    var val, safety = 0;
    do {
      val = Math.floor(Math.random() * (max - min + 1)) + min;
      safety++;
    } while (exclude && exclude.indexOf(val) !== -1 && safety < 100);
    return val;
  }
  function gcd(a, b) { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
  function gcd3(a, b, c) { return gcd(a, gcd(b, c)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 수식 조각을 산문 안에 넣을 때 쓴다. 이걸 쓰면 LaTeX 누출이 날 수 없다. */
  function M(x) { return "\\(" + x + "\\)"; }

  /* 수식 안에서 항을 이어붙일 때 쓴다. 값만 꽂으면 양수일 때 부호가 빠져
     "-3(x^2 - 4x + 4) 12 -23" 처럼 붙어버린다. signed(12) 는 "+ 12" 를 준다. */
  function signed(n, unit) {
    var v = Number(n);
    if (!isFinite(v)) return String(n);
    return (v < 0 ? "- " : "+ ") + Math.abs(v) + (unit || "");
  }
  function Mu(v, unit) { return "\\(" + v + "\\text{ " + unit + "}\\)"; }

  /* **굵게** → <b>. innerHTML 주입이라 별표가 그대로 보이는 것을 막는다. */
  function rich(s) {
    return String(s == null ? "" : s).replace(/\*\*([\s\S]+?)\*\*/g, "<b>$1</b>");
  }

  /* 부호가 붙은 항을 사람이 쓰듯 찍는다. isFirst 면 앞의 + 를 생략한다. */
  function fmtTerm(c, v, isFirst) {
    if (c === 0) return "";
    var sign = c > 0 ? (isFirst ? "" : "+ ") : (isFirst ? "-" : "- ");
    var mag = Math.abs(c);
    var num = (mag === 1 && v) ? "" : String(mag);
    return sign + num + (v || "");
  }

  /* ───────────────────── 2. 보기 중복 방어 (3층) ─────────────────────
     Unit 1 의 값 기준 정규화 + Unit 2 의 3단 리필을 합친 것이다.
     예전에는 유닛마다 이 중 한 층씩만 있어서 "정답이 두 개"가 반복해서 났다. */

  /* 층1 — 문자열 키 (공백만 정리) */
  function key(s) {
    return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  }

  /* 층2 — 값 키. (x+2)(x-2) 와 (x-2)(x+2) 를 같은 것으로 본다.
     괄호 순서와 괄호 안 항 순서를 모두 정렬해서 비교한다. */
  function factorKey(s) {
    var str = String(s == null ? "" : s)
      .replace(/^\s*[A-D]\)\s*/, "")
      /* 보이기용 명령과 감싸개만 걷어낸다. \sin 과 \cos 처럼 뜻이 다른 명령은
         반드시 남겨야 한다. 예전에는 \\[a-zA-Z]+ 를 통째로 지워서
         sin^-1(...) 과 cos^-1(...) 이 같은 보기로 취급됐다. */
      .replace(/\\\(|\\\)|\\\[|\\\]|\$\$/g, "")
      .replace(/\\(left|right|quad|qquad|displaystyle|small|,|;|!|:|\s)/g, "")
      .replace(/\\[dt]frac/g, "\\frac")
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\s|\{|\}/g, "");

    /* 곱셈은 순서를 바꿔도 같다. 단, 문자열 전체가 "계수 + 괄호묶음들"
       형태일 때만 그렇게 본다. 좌표나 여러 값을 나열한 보기까지 정렬해 버리면
       (x=17.2, Y=55.2, X=34.8) 과 (x=17.2, Y=34.8, X=55.2) 가 같아진다. */
    if (!/^[-+]?[0-9]*(\([^()]*\))+$/.test(str)) return str;
    var lead = str.slice(0, str.indexOf("("));
    var parts = str.match(/\([^()]*\)/g) || [];
    return lead + "|" + parts.map(function (p) {
      return p.slice(1, -1).replace(/-/g, "+-").split("+")
              .filter(function (x) { return x !== ""; }).sort().join("+");
    }).sort().join("|");
  }

  /* 값이 같은 후보를 걸러 서로 다른 것만 남긴다. 생성기에서 후보를 넉넉히
     만들어 이걸 통과시키면 "정답과 같은 오답"이 원천적으로 안 생긴다. */
  function uniqueByValue(list) {
    var seen = [], out = [];
    for (var i = 0; i < list.length; i++) {
      var k = factorKey(list[i]);
      if (seen.indexOf(k) !== -1) continue;
      seen.push(k); out.push(list[i]);
    }
    return out;
  }

  /* 층3 — 그래도 4개가 안 되면 정답의 숫자를 밀어 예비 보기를 만든다.
     소수 자릿수를 보존한다. 8.50 → 9.50 이지 9 가 아니다. */
  function spareOption(base, n) {
    var hit = false;
    var out = String(base).replace(/-?\d+(?:\.\d+)?/, function (m) {
      hit = true;
      var dec = (m.split(".")[1] || "").length;
      var v = parseFloat(m) + n;
      return dec ? v.toFixed(dec) : String(v);
    });
    return hit ? out : null;
  }

  /* 정답 1개 + 오답들 → A~D 4개. 값 중복 제거 → 예비 후보 → 숫자 밀기 순으로
     채운다. 끝내 못 채우면 쓰레기 보기를 넣는 대신 개수를 줄인다.
     ("D) undefined" 가 학생 화면에 뜨는 것보다 3지선다가 낫다.) */
  function shuffleMC(correct, distractors, fallbacks) {
    /* 호출 방식 두 가지를 모두 받는다.
         shuffleMC(정답, [오답들], [예비])        <- 표준
         shuffleMC([후보배열], 정답)              <- 옛 Unit 1 방식
       옛 파일을 기계적으로 전환할 때 호출부를 일일이 고치지 않아도 되게 한다. */
    if (Array.isArray(correct)) {
      var arr = correct, ans = distractors;
      correct = ans;
      distractors = arr.filter(function (x) { return String(x) !== String(ans); });
      fallbacks = null;
    }
    var pool = uniqueByValue([correct].concat(distractors || []));
    var ck = factorKey(correct);

    if (pool.length < 4 && fallbacks) {
      fallbacks.forEach(function (f) {
        if (pool.length >= 4) return;
        if (f == null || f === "") return;
        if (factorKey(f) === ck) return;
        if (pool.some(function (p) { return factorKey(p) === factorKey(f); })) return;
        pool.push(f);
      });
    }
    for (var n = 1; pool.length < 4 && n <= 8; n++) {
      [n, -n].forEach(function (d) {
        if (pool.length >= 4) return;
        var s = spareOption(correct, d);
        if (!s) return;
        if (factorKey(s) === ck) return;
        if (pool.some(function (p) { return factorKey(p) === factorKey(s); })) return;
        pool.push(s);
      });
    }

    pool = pool.slice(0, 4);
    var mixed = shuffle(pool);
    var letters = ["A", "B", "C", "D"];
    var options = [], ans = "";
    for (var i = 0; i < mixed.length; i++) {
      options.push(letters[i] + ") " + mixed[i]);
      if (factorKey(mixed[i]) === ck) ans = letters[i];
    }
    /* 유닛마다 키 이름이 달랐다. Unit 1·2·3 은 ans, Unit 4 는 ansLetter 를 읽는다.
       둘 다 돌려줘서 어느 파일이든 그대로 돌아가게 한다. */
    return { options: options, ans: ans, ansLetter: ans, rawAns: correct };
  }

  /* 마지막 그물. 생성기가 위를 안 썼더라도 여기서 한 번 더 거른다.
     그래프 보기 유형은 본문이 비어 있으므로 통과시킨다(설계대로). */
  function dedupe(p) {
    if (!p || !p.options) return p;
    if (p.optionType && p.optionType !== "text") return p;

    var letters = ["A", "B", "C", "D"];
    var bodies = p.options.map(function (o) { return String(o).replace(/^\s*[A-D]\)\s*/, ""); });
    var ansIdx = letters.indexOf(String(p.ans || "").trim());
    if (ansIdx < 0) return p;

    var seen = {}, changed = false;
    for (var i = 0; i < bodies.length; i++) {
      var k = factorKey(bodies[i]);
      if (!seen[k]) { seen[k] = true; continue; }
      if (i === ansIdx) continue;               /* 정답은 건드리지 않는다 */
      for (var n = 1; n <= 12; n++) {
        var cand = spareOption(bodies[i], n) || spareOption(bodies[i], -n);
        if (cand && !seen[factorKey(cand)]) {
          bodies[i] = cand; seen[factorKey(cand)] = true; changed = true; break;
        }
      }
    }
    if (changed) {
      p.options = bodies.map(function (b, i) { return letters[i] + ") " + b; });
    }
    return p;
  }

  /* 풀이 방법 묶음. 문항 파일이 p.methods 로 그대로 쓴다.
       FACTORING : 삼항식 인수분해 (중간항을 쪼개는 것). special case 는 제외.
       SOLVING   : 근의공식으로도 풀고 인수분해로도 풀 수 있는 것. 탭 3개. */
  var METHODS_FACTORING = [
    { key: "ps", label: "Product &amp; Sum Method" },
    { key: "cc", label: "Criss-Cross Matrix Method" }
  ];
  var METHODS_SOLVING = [
    { key: "qf", label: "Quadratic Formula" },
    { key: "ps", label: "Product &amp; Sum Method" },
    { key: "cc", label: "Criss-Cross Matrix Method" }
  ];

  /* 판별식이 완전제곱이 아니면 정수로 인수분해되지 않는다.
     그럴 때도 탭은 그대로 띄우고, 탭 안에서 왜 안 되는지 알려준다.
     (탭 개수가 문제마다 달라지면 학생이 더 헷갈린다.) */
  function factorable(a, b, c) {
    var D = b * b - 4 * a * c;
    if (D < 0) return false;
    var r = Math.round(Math.sqrt(D));
    return r * r === D;
  }

  /* ax^2+bx+c 를 정수로 쪼갤 때 쓰는 값들을 한 번에 돌려준다.
     m, n  : 중간항을 쪼갤 두 수 (m+n=b, mn=ac)
     a1..c2: 대각선 곱 상자의 네 칸. (a1x + c1)(a2x + c2) 가 원식이다.
     인수분해가 안 되면 null. */
  function splitPair(a, b, c) {
    if (!factorable(a, b, c)) return null;
    var root = Math.round(Math.sqrt(b * b - 4 * a * c));
    var m = (b + root) / 2, n = (b - root) / 2;
    if (!Number.isInteger(m) || !Number.isInteger(n)) return null;
    var g1 = gcd(a, m);
    if (!g1) return null;
    if (a < 0) g1 = -Math.abs(g1);
    var a2 = a / g1, c2 = m / g1;
    if (!Number.isInteger(a2) || !Number.isInteger(c2) || a2 === 0) return null;
    var c1 = n / a2;
    if (!Number.isInteger(c1)) return null;
    if (g1 * c2 + a2 * c1 !== b || c1 * c2 !== c) return null;
    return { m: m, n: n, a1: g1, a2: a2, c1: c1, c2: c2 };
  }

  function noFactorStep(mode, a, b, c) {
    var D = b * b - 4 * a * c;
    return {
      title: "This one does not factor",
      mode: mode,
      math: "b^2 - 4ac = (" + b + ")^2 - 4(" + a + ")(" + c + ") = " + D,
      explanation: "Splitting the middle term only works when " + M("b^2 - 4ac") +
        " is a perfect square. Here it comes to " + M(D) +
        (D < 0 ? ", which is negative, so there are no real answers to find. "
               : ", and no whole number squares to give that. ") +
        "So no pair of whole numbers will split this middle term. " +
        "Use the Quadratic Formula tab instead, which works on every quadratic."
    };
  }

  /* ───────────────────────── 3. 렌더 ───────────────────────── */

  var KATEX_DELIMS = [
    { left: "$$", right: "$$", display: true },
    { left: "\\(", right: "\\)", display: false }
  ];

  function renderMath(root) {
    if (global.renderMathInElement) {
      global.renderMathInElement(root || document.body,
        { delimiters: KATEX_DELIMS, throwOnError: false });
    }
  }

  function el(id) { return document.getElementById(id); }

  /* Unit 1 은 topic-select, Unit 2~4 는 question-select 를 썼다.
     통일 목표는 question-select 지만 옛 파일도 계속 돌아야 하므로 둘 다 본다. */
  function selectEl() {
    return el("question-select") || el("topic-select");
  }

  /* 이미 \( \) 나 $$ 로 감싸져 있으면 그대로 두고, 맨몸이면 감싼다.
     step.math 는 18파일 전수 조사에서 산문 혼합률이 0% 였다. 그래서
     이 필드에 한해 자동 래핑이 안전하다. 설명문·문제문은 혼합이라
     자동 래핑이 불가능하므로 생성기가 M() 을 써야 한다. */
  function wrapMath(s) {
    var v = String(s == null ? "" : s).trim();
    if (!v) return "";
    if (/^\\\(/.test(v) || /^\$\$/.test(v)) return v;
    /* 산문을 수식으로 감싸면 안 된다. LaTeX 는 공백을 무시하기 때문에
       "Range = all the y-values" 가 "Range=allthey-values" 로 붙어버린다.
       그래서 LaTeX 흔적이 하나도 없으면서 영어 단어가 둘 이상이면
       문장으로 보고 그대로 둔다. (\text{...} 로 감싼 것은 흔적이 있으므로 감싼다.) */
    if (!/[\\^_{}]/.test(v)) {
      var words = v.match(/[A-Za-z]{3,}/g) || [];
      if (words.length >= 2) return v;
    }
    return "\\(" + v + "\\)";
  }

  var markerSeq = 0;

  /* 대각선 곱 상자. Unit 1 Lesson 4 / 연습시험에 각각 하드코딩돼 있던 것을
     한 곳으로 모았다. 화살표 방향과 모양은 원본과 동일하다. */
  function matrixBox(d) {
    var mid = "mcf-arrow-" + (++markerSeq);
    /* 칸 값 정리. 두 가지가 학생 화면에 그대로 새던 것들이다:
         "--5"  : 음수 앞에 마이너스를 또 붙여 만든 값
         ""     : 합이 0 이라 fmtTerm 이 빈 문자열을 돌려준 경우 (칸이 비어 보인다) */
    d = Object.keys(d).reduce(function (o, k) {
      var v = String(d[k] == null ? "" : d[k]).trim();
      v = v.replace(/^\+?-\s*-\s*/, "+").replace(/^-\s*-\s*/, "+");
      v = v.replace(/^\+\s*\+\s*/, "+");
      if (v === "" || v === "+" || v === "-") v = "0";
      o[k] = v;
      return o;
    }, {});
    return '' +
      '<div class="criss-cross-box"><div class="matrix-grid">' +
        '<div>' + wrapMath(d.lt) + '</div>' +
        '<div class="svg-intersection-container">' +
          '<svg width="70" height="70" viewBox="0 0 70 70" style="overflow: visible;">' +
            '<defs><marker id="' + mid + '" viewBox="0 0 10 10" refX="5" refY="5" ' +
              'markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
              '<path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" /></marker></defs>' +
            '<line x1="5" y1="10" x2="65" y2="60" stroke="#2563eb" stroke-width="2.5" marker-end="url(#' + mid + ')" />' +
            '<line x1="5" y1="60" x2="65" y2="10" stroke="#2563eb" stroke-width="2.5" marker-end="url(#' + mid + ')" />' +
          '</svg>' +
        '</div>' +
        '<div>' + wrapMath(d.rt) + '</div> <div class="grid-arrow-label">&rarr;</div> <div>' + wrapMath(d.pt) + '</div>' +
        '<div>' + wrapMath(d.lb) + '</div> <div>' + wrapMath(d.rb) + '</div> <div class="grid-arrow-label">&rarr;</div> <div>' + wrapMath(d.pb) + '</div>' +
        '<div class="matrix-total-line"><strong>Sum of Diagonal Products:</strong> ' +
          wrapMath("(" + d.pt + ") + (" + d.pb + ") = " + d.sum) + '</div>' +
      '</div></div>';
  }

  function stepHTML(s) {
    var cls = "step-block";
    if (s.mode && s.mode !== "common") cls += " " + s.mode + "-only";
    else cls += " common-step";

    var body = "";
    /* step.figure — 풀이 단계에 붙이는 시각 자료 (SVG·표·수형도 등 HTML 그대로).
       배열이면 나란히 놓는다. 수식이 아니므로 wrapMath 를 태우지 않는다.
       (2026-08-21 추가. 이 필드를 쓰는 옛 파일이 없어 하위 호환이다.) */
    if (s.figure) body += '<div class="step-figure">' +
      (Object.prototype.toString.call(s.figure) === "[object Array]" ? s.figure.join("") : s.figure) + '</div>';
    if (s.isMatrix) body += matrixBox(s.matrixData || {});
    else if (s.math) body += '<div class="step-math">' + wrapMath(s.math) + '</div>';
    if (s.rule) body += '<span class="math-rule">' + rich(s.rule) + '</span>';

    return '<div class="' + cls + '">' +
      '<span class="step-title">' + rich(s.title || "") + '</span>' +
      body +
      '<span class="step-explanation">' + rich(s.explanation || "") + '</span>' +
      '</div>';
  }

  function buildOptionsHTML(p, selectedLetter) {
    if (p.optionType && p.optionType !== "text") {
      /* 그래프 보기. 본문이 SVG 라 수식 래핑을 하지 않는다.
         유닛에 따라 보기 SVG 를 만드는 방법이 다르다.
           보기 문자열에 SVG 가 이미 들어 있는 경우  -> 그대로 쓴다
           optionSpecs 를 렌더러에 넘겨 그리는 경우   -> MCF.init 의 renderOption 을 쓴다 */
      return '<div class="mc-options-list graph-grid">' + p.options.map(function (opt, i) {
        var L = opt.charAt(0);
        var sel = L === selectedLetter ? " selected" : "";
        var body = "";
        if (state.renderOption) { try { body = state.renderOption(p, i); } catch (e) { body = ""; } }
        if (!body) body = opt.substring(3);
        return '<div class="mc-option-card graph-card' + sel + '" onclick="selectMcOptionCard(\'' + L + '\')">' +
          '<span class="mc-badge">' + L + '</span><div class="option-graph">' + body + '</div></div>';
      }).join("") + '</div>';
    }
    return '<div class="mc-options-list">' + p.options.map(function (opt) {
      var L = opt.charAt(0);
      var sel = L === selectedLetter ? " selected" : "";
      var bodyText = opt.substring(3);
      /* 보기 본문은 대부분 순수 수식이다. 이미 감싸져 있으면 그대로 두고,
         맨몸이면 감싼다. 감싸지 않으면 \text{...} 가 글자로 노출된다. */
      return '<div class="mc-option-card' + sel + '" onclick="selectMcOptionCard(\'' + L + '\')">' +
        '<span class="mc-badge">' + L + '</span>' +
        '<span>' + wrapMath(bodyText) + '</span></div>';
    }).join("") + '</div>';
  }

  /* ═════════════════ 3.5 재시도 엔진 (보스 전용, opt-in) ═════════════════

     왜 오답이 그 자리에서 확정되나:
       v1 은 오답이면 showTryAgain() 을 띄우고 같은 문제에서 다시 고르게 했다.
       그 상태로 오답을 세면 학생이 A→B→C 로 훑어 정답에 닿을 수 있어서
       "오답 수"가 실력이 아니라 보기 개수를 재게 된다. 보스는 시험이므로
       한 문제에 한 번만 답한다.
  */

  /* 빚은 (유형 × 난이도)마다 따로 진다. 난이도를 키에 안 넣으면 학생이
     쉬운 쪽만 반복해서 유형을 통과할 수 있다. */
  function retryKey(typeId) {
    return typeId + (state.retry.level ? "@" + state.retry.level : "");
  }
  function retryRec(typeId) {
    var k = retryKey(typeId);
    var m = state.retry.byType;
    if (!m[k]) m[k] = { tries: 0, correct: 0, wrong: 0, streak: 0 };
    return m[k];
  }
  /* 문항 파일의 난이도 버튼이 부른다. 빚이 남아 있으면 못 바꾼다. */
  function setRetryLevel(v) {
    if (!state.retry.on) { state.retry.level = v; return true; }
    if (state.retry.lockedLevel && state.retry.lockedLevel !== v) return false;
    state.retry.level = v;
    retryPaint();
    return true;
  }

  /* 통과까지 남은 정답 수. 0 이하면 통과다. */
  function retryNeed(r) { return (r.wrong + 1) - r.correct; }

  function retryStyle() {
    if (el("core-retry-style")) return;
    var s = document.createElement("style");
    s.id = "core-retry-style";
    s.textContent =
      ".retry-status{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;" +
      "margin:0 0 16px;padding:11px 15px;border-radius:10px;background:#eef2ff;" +
      "border:1px solid #c7d2fe;font-size:.93rem;color:#1e293b}" +
      ".retry-status .retry-type{font-weight:700;color:#3730a3}" +
      ".retry-status .retry-need{margin-left:auto;font-weight:700;color:#b45309}" +
      ".retry-status .retry-clear{margin-left:auto;font-weight:700;color:#047857}" +
      ".retry-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;" +
      "display:none;align-items:center;justify-content:center;background:rgba(15,23,42,.80)}" +
      ".retry-modal{background:#fff;border-radius:18px;padding:44px 38px;max-width:560px;" +
      "width:88%;text-align:center;box-shadow:0 30px 70px rgba(0,0,0,.45);" +
      "border-top:7px solid #f59e0b}" +
      ".retry-modal-title{font-size:2.05rem;font-weight:800;color:#b45309;" +
      "margin:0 0 16px;line-height:1.25}" +
      ".retry-modal-body{font-size:1.12rem;line-height:1.62;color:#334155;margin:0 0 28px}" +
      ".retry-btn-main{display:inline-block;background:#4338ca;color:#fff;" +
      "text-decoration:none;font-size:1.05rem;font-weight:700;padding:14px 30px;" +
      "border-radius:10px;margin:0 6px 12px}" +
      ".retry-btn-ghost{display:block;margin:0 auto;background:none;border:none;" +
      "color:#64748b;font-size:.88rem;text-decoration:underline;cursor:pointer;padding:6px 10px}" +
      ".retry-link{display:block;text-align:left;text-decoration:none;background:#fffbeb;" +
      "border:1px solid #fcd34d;border-radius:11px;padding:13px 16px;margin:0 0 10px}" +
      ".retry-link:hover{background:#fef3c7}" +
      ".retry-link .rl-lesson{display:block;font-size:.82rem;font-weight:700;" +
      "color:#92400e;letter-spacing:.02em;text-transform:uppercase}" +
      ".retry-link .rl-type{display:block;font-size:1.05rem;font-weight:700;color:#1e293b;margin-top:3px}" +
      ".type-sent{margin:0 0 16px;padding:11px 15px;border-radius:10px;background:#fffbeb;" +
      "border:1px solid #fcd34d;font-size:.93rem;color:#78350f}";
    document.head.appendChild(s);
  }

  /* 진행 표시줄. 없으면 quiz-station 맨 위에 만들어 넣는다.
     head.part 를 고치지 않아도 되도록 DOM 을 여기서 만든다. */
  function retryBar() {
    var bar = el("retry-status");
    if (bar) return bar;
    var host = el("quiz-station");
    if (!host) return null;
    bar = document.createElement("div");
    bar.id = "retry-status";
    bar.className = "retry-status";
    host.insertBefore(bar, host.firstChild);
    return bar;
  }

  function retryPaint() {
    if (!state.retry.on) return;
    var bar = retryBar();
    if (!bar) return;
    var sel = selectEl();
    var typeId = sel ? sel.value : "";
    if (!typeId) { bar.style.display = "none"; return; }

    var r = retryRec(typeId);
    var need = retryNeed(r);
    var label = (sel && sel.selectedIndex >= 0)
      ? sel.options[sel.selectedIndex].text : typeId;

    bar.innerHTML =
      '<span class="retry-type">' + label + '</span>' +
      '<span class="retry-nums">Attempts <strong>' + r.tries + '</strong>' +
      ' &middot; Correct <strong>' + r.correct + '</strong>' +
      ' &middot; Wrong <strong>' + r.wrong + '</strong></span>' +
      (need > 0
        ? '<span class="retry-need">Get <strong>' + need +
          '</strong> more correct to clear this type</span>'
        : '<span class="retry-clear">Cleared &#10004;</span>');
    bar.style.display = "flex";

    /* 빚이 남아 있으면 유형을 못 바꾼다. */
    if (sel) sel.disabled = !!state.retry.lockedType;
  }

  function retryPopup(p) {
    var ov = el("retry-overlay");
    if (!ov) {
      ov = document.createElement("div");
      ov.id = "retry-overlay";
      ov.className = "retry-overlay";
      document.body.appendChild(ov);
    }
    /* p.review — 이 문제가 섞은 레슨과 유형. 문항이 준다.
         [{ lesson:"Lesson 2: Integer Operations",
            type  :"Type 5: Rewriting as Addition",
            url   :"Unit 1 Lesson 2 Integer Operations.html?type=t5" }, ...]
       레슨만 찍으면 학생이 그 파일에서 또 헤맨다. 유형까지 찍어야
       "어디로 가서 무엇을 연습하라"가 완성된다.
       옛 형식(문자열 하나)도 받아 준다. */
    var rv = (p && p.review) ? p.review : null;
    if (rv && Object.prototype.toString.call(rv) !== "[object Array]") {
      rv = [{ lesson: "", type: String(rv), url: state.retry.backUrl }];
    }
    var links = "";
    if (rv && rv.length) {
      links = rv.map(function (it) {
        var inner = (it.lesson ? '<span class="rl-lesson">' + it.lesson + '</span>' : "") +
                    '<span class="rl-type">' + (it.type || "") + '</span>';
        return it.url ? '<a class="retry-link" href="' + it.url + '">' + inner + '</a>'
                      : '<div class="retry-link">' + inner + '</div>';
      }).join("");
    }
    var main = (!links && state.retry.backUrl)
      ? '<a class="retry-btn-main" href="' + state.retry.backUrl + '">' +
        state.retry.backLabel + '</a>'
      : "";
    ov.innerHTML =
      '<div class="retry-modal">' +
        '<div class="retry-modal-title">Time to go back and practise</div>' +
        '<div class="retry-modal-body">That is three wrong in a row.' +
          (links ? ' Practise these first, then come back to the test.' : '') +
        '</div>' + links + main +
        '<button class="retry-btn-ghost" onclick="dismissRetryHalt()">' +
        'Keep trying anyway</button>' +
      '</div>';
    ov.style.display = "flex";
    state.retry.halted = true;
  }

  /* 보스 팝업의 링크를 타고 오면 URL 에 ?type=t5 가 붙어 있다.
     그 유형을 드롭다운에 미리 맞춰 두고, 왜 여기 왔는지 한 줄 띄운다.
     문제를 자동 생성하지는 않는다 — progress.js 가 Generate 를 감싸고 있어서
     그 경로를 건너뛰면 진행 기록이 어긋난다. */
  function applyTypeFromURL() {
    var sel = selectEl();
    if (!sel || !global.location) return;
    var m = /[?&]type=([^&#]+)/.exec(global.location.search || "");
    if (!m) return;
    var want = decodeURIComponent(m[1]);
    var label = "";
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === want) { sel.selectedIndex = i; label = sel.options[i].text; break; }
    }
    if (!label) return;
    var host = (sel.closest && sel.closest(".selector-box")) || sel.parentNode;
    if (!host || !host.parentNode) return;
    var note = document.createElement("div");
    note.className = "type-sent";
    note.innerHTML = "You were sent here to practise <strong>" + label +
      "</strong>. It is already selected \u2014 tap Generate to start.";
    host.parentNode.insertBefore(note, host.nextSibling);
  }

  /* 팝업을 무시하고 계속하는 경우. 연속 카운터만 0 으로 돌린다.
     누적 오답(=통과에 필요한 정답 수)은 그대로 남는다. */
  function dismissRetryHalt() {
    var ov = el("retry-overlay");
    if (ov) ov.style.display = "none";
    state.retry.halted = false;
    var sel = selectEl();
    if (sel && sel.value) retryRec(sel.value).streak = 0;
  }

  /* ═════════════ 3.6 스캐폴딩 엔진 (레슨 전용, opt-in, v2.1) ═════════════

     왜 오답에서만 열리나:
       "도와줘" 버튼을 두면 학생이 어려운 문제를 만날 때마다 먼저 누른다.
       그러면 스캐폴딩이 **생각을 미루는 자리**가 되지, 막힌 곳을 찾는
       자리가 되지 않는다. 오답에서만 열면 학생이 한 번은 반드시 스스로
       판단한 뒤에 열리고, 그 판단이 어디서 틀렸는지가 곧 시작 지점이 된다.

     왜 동형 문제가 필수인가:
       스텝은 4지선다다. 아무렇게나 찍어도 25% 로 뚫리고, 파이프라인
       언블로킹 때문에 틀려도 정답이 펴 보이며 다음으로 넘어간다. 즉
       스캐폴딩만으로는 "클릭해서 끝까지 가기"가 언제나 가능하다.
       그것을 막는 것은 무보조로 푸는 새 문제 하나뿐이다.
  */

  /* ask 가 달린 스텝의 인덱스 목록. 없으면 빈 배열 = 이 문항은 v2.0 대로 돈다. */
  function askList(p) {
    var out = [];
    ((p && p.steps) || []).forEach(function (s, i) {
      if (s && s.ask && s.ask.options && s.ask.options.length && s.ask.answer) out.push(i);
    });
    return out;
  }

  /* 고른 오답이 어느 스텝을 가리키나. p.distractors[].step 은 **1부터** 센다
     (학생 화면의 "Step 2" 와 같은 번호). 라우팅이 없으면 -1. */
  function scRouteFor(p, letter) {
    var i = ["A", "B", "C", "D"].indexOf(letter);
    if (i < 0 || !p || !p.options) return -1;
    var body = String(p.options[i] || "").replace(/^\s*[A-D]\)\s*/, "");
    var k = factorKey(body);
    var ds = p.distractors || [];
    for (var j = 0; j < ds.length; j++) {
      var d = ds[j];
      if (!d || !d.step) continue;
      if (factorKey(d.value) === k) return d.step - 1;
    }
    return -1;
  }

  function scStyle() {
    if (el("core-sc-style")) return;
    var s = document.createElement("style");
    s.id = "core-sc-style";
    s.textContent =
      ".sc-panel{margin:18px 0 4px;border:2px solid #c7d2fe;border-radius:14px;" +
      "background:#f8faff;padding:0 0 6px;overflow:hidden}" +
      ".sc-head{background:#4338ca;color:#fff;font-weight:700;font-size:1rem;" +
      "padding:12px 18px;letter-spacing:.01em}" +
      ".sc-head small{display:block;font-weight:500;opacity:.85;font-size:.83rem;margin-top:3px}" +
      ".sc-step{padding:16px 18px;border-bottom:1px solid #e2e8f0}" +
      ".sc-step:last-child{border-bottom:none}" +
      ".sc-step.done{background:#f1f5f9}" +
      ".sc-no{display:inline-block;font-size:.76rem;font-weight:800;letter-spacing:.06em;" +
      "text-transform:uppercase;color:#4338ca;margin-bottom:6px}" +
      ".sc-step.done .sc-no{color:#64748b}" +
      ".sc-prompt{font-weight:700;color:#1e293b;margin:0 0 12px;line-height:1.5}" +
      ".sc-opts{display:grid;gap:8px}" +
      ".sc-opt{display:flex;align-items:center;gap:11px;border:2px solid #e2e8f0;" +
      "border-radius:10px;padding:11px 14px;background:#fff;cursor:pointer;line-height:1.4}" +
      ".sc-opt:hover{border-color:#a5b4fc;background:#eef2ff}" +
      ".sc-opt.locked{cursor:default}" +
      ".sc-opt.locked:hover{border-color:#e2e8f0;background:#fff}" +
      ".sc-opt.right{border-color:#059669;background:#ecfdf5}" +
      ".sc-opt.right:hover{border-color:#059669;background:#ecfdf5}" +
      ".sc-opt.wrong{border-color:#dc2626;background:#fef2f2}" +
      ".sc-opt.wrong:hover{border-color:#dc2626;background:#fef2f2}" +
      ".sc-badge{flex:none;width:26px;height:26px;border-radius:7px;background:#e0e7ff;" +
      "color:#3730a3;font-weight:800;font-size:.85rem;display:flex;align-items:center;" +
      "justify-content:center}" +
      ".sc-opt.right .sc-badge{background:#059669;color:#fff}" +
      ".sc-opt.wrong .sc-badge{background:#dc2626;color:#fff}" +
      ".sc-note{margin:12px 0 0;padding:11px 14px;border-radius:9px;font-size:.94rem;line-height:1.55}" +
      ".sc-note.ok{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}" +
      ".sc-note.miss{background:#fffbeb;border:1px solid #fcd34d;color:#78350f}" +
      ".sc-nano{margin:12px 0 0 0;padding:14px 16px;border-left:4px solid #7c3aed;" +
      "background:#faf5ff;border-radius:0 10px 10px 0}" +
      ".sc-nano-lab{font-size:.76rem;font-weight:800;letter-spacing:.06em;" +
      "text-transform:uppercase;color:#6d28d9;margin-bottom:7px}" +
      ".sc-done{padding:18px;text-align:center}" +
      ".sc-done p{margin:0 0 14px;color:#334155;line-height:1.6}" +
      ".sc-twin-btn{background:#059669;color:#fff;border:none;border-radius:10px;" +
      "font-size:1.02rem;font-weight:700;padding:13px 28px;cursor:pointer}" +
      ".sc-twin-btn:hover{background:#047857}" +
      ".sc-twin-flag{margin:0 0 16px;padding:12px 16px;border-radius:10px;" +
      "background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:.95rem;line-height:1.5}";
    document.head.appendChild(s);
  }

  /* 패널은 피드백 줄 바로 아래에 산다. head.part 를 고치지 않아도 되도록
     DOM 을 여기서 만든다. */
  function scHost() {
    var host = el("sc-panel-host");
    if (host) return host;
    var anchor = el("feedback-msg");
    var box = el("quiz-station");
    if (!box) return null;
    host = document.createElement("div");
    host.id = "sc-panel-host";
    if (anchor && anchor.parentNode === box) box.insertBefore(host, anchor.nextSibling);
    else box.appendChild(host);
    return host;
  }

  function scClear() {
    var host = el("sc-panel-host");
    if (host) { host.innerHTML = ""; host.style.display = "none"; }
    state.sc.live = false;
    state.sc.list = [];
    state.sc.state = [];
    state.sc.at = 0;
    state.sc.blind = -1;
    state.sc.nanoAt = -1;
    state.sc.nanoState = [];
  }

  /* 스캐폴딩을 연다. from 은 시작할 스텝의 인덱스(p.steps 기준). -1 이면 처음부터. */
  function scOpen(from) {
    var p = state.problem;
    if (!state.sc.on || !p) return;
    var list = askList(p);
    if (!list.length) return;

    state.sc.list = list;
    state.sc.state = list.map(function () { return "wait"; });
    var at = 0;
    if (from >= 0) {
      for (var i = 0; i < list.length; i++) if (list[i] === from) { at = i; break; }
    }
    /* 건너뛴 앞 스텝은 "이미 알고 있는 것"으로 펴 놓는다. 라우팅의 뜻이
       "여기가 막힌 곳"이므로, 그 앞을 다시 묻는 것은 시간 낭비다. */
    for (var j = 0; j < at; j++) state.sc.state[j] = "given";
    state.sc.at = at;
    state.sc.state[at] = "open";
    state.sc.live = true;
    state.sc.nanoAt = -1;
    scRender();
  }

  function scOptCard(opt, cls, onclick) {
    var L = String(opt).charAt(0);
    var body = String(opt).substring(3);
    return '<div class="sc-opt ' + cls + '"' +
      (onclick ? ' onclick="' + onclick + '"' : "") + '>' +
      '<span class="sc-badge">' + L + '</span>' +
      '<span>' + wrapMath(body) + '</span></div>';
  }

  /* 한 스텝(마이크로)을 그린다. */
  function scStepHTML(k) {
    var p = state.problem;
    var si = state.sc.list[k];
    var s = p.steps[si];
    var a = s.ask;
    var st = state.sc.state[k];
    var no = "Step " + (si + 1);

    if (st === "wait") return "";

    if (st === "given") {
      return '<div class="sc-step done"><span class="sc-no">' + no + ' &mdash; already sorted</span>' +
        '<div class="sc-prompt">' + rich(a.prompt || s.title || "") + '</div>' +
        '<div class="sc-note ok">' + wrapMath(s.math || "") +
        (s.explanation ? '<div style="margin-top:6px">' + rich(s.explanation) + '</div>' : "") +
        '</div></div>';
    }

    var done = (st === "got" || st === "shown");
    var html = '<div class="sc-step' + (done ? " done" : "") + '">' +
      '<span class="sc-no">' + no + '</span>' +
      '<div class="sc-prompt">' + rich(a.prompt || s.title || "") + '</div>' +
      '<div class="sc-opts">' + a.options.map(function (o) {
        var L = String(o).charAt(0);
        var cls = "";
        if (done) {
          cls = "locked";
          if (L === a.answer) cls += " right";
          else if (st === "shown" && L === state.sc.picked) cls += " wrong";
        }
        return scOptCard(o, cls, done ? "" : "scPick('" + L + "')");
      }).join("") + '</div>';

    if (st === "got") {
      html += '<div class="sc-note ok"><strong>Yes.</strong> ' +
        (s.math ? wrapMath(s.math) + " " : "") + rich(s.explanation || "") + '</div>';
    }
    if (st === "shown") {
      html += '<div class="sc-note miss"><strong>The answer was ' + a.answer + '.</strong> ' +
        (s.math ? wrapMath(s.math) + " " : "") + rich(s.explanation || "") + '</div>';
    }

    /* 나노가 열려 있으면 이 스텝 아래에 붙는다. */
    if (!done && state.sc.nanoAt >= 0 && a.nano && a.nano.length) {
      html += a.nano.map(function (n, i) {
        var ns = state.sc.nanoState[i];
        if (ns === "wait") return "";
        var ndone = (ns === "got" || ns === "shown");
        var inner = '<div class="sc-nano-lab">Break it down &mdash; part ' + (i + 1) +
          ' of ' + a.nano.length + '</div>' +
          '<div class="sc-prompt">' + rich(n.prompt || "") + '</div>' +
          '<div class="sc-opts">' + n.options.map(function (o) {
            var L = String(o).charAt(0);
            var cls = "";
            if (ndone) {
              cls = "locked";
              if (L === n.answer) cls += " right";
              else if (ns === "shown" && L === state.sc.nanoPicked) cls += " wrong";
            }
            return scOptCard(o, cls, ndone ? "" : "scNano('" + L + "')");
          }).join("") + '</div>';
        if (ns === "shown") inner += '<div class="sc-note miss"><strong>The answer was ' +
          n.answer + '.</strong> ' + rich(n.hint || "") + '</div>';
        return '<div class="sc-nano">' + inner + '</div>';
      }).join("");
    }

    return html + '</div>';
  }

  function scRender() {
    var host = scHost();
    var p = state.problem;
    if (!host || !p) return;
    var all = state.sc.list.map(function (_, k) { return scStepHTML(k); }).join("");

    var finished = state.sc.at >= state.sc.list.length;
    var head = finished
      ? '<div class="sc-head">Walked through &mdash; now your turn' +
        '<small>You worked out every step. The next one is on you.</small></div>'
      : '<div class="sc-head">Let us walk it through' +
        '<small>One step at a time. This question no longer counts for points &mdash; ' +
        'a fresh one will.</small></div>';

    var tail = finished
      ? '<div class="sc-done"><p>Here is <strong>a new question of the same kind</strong>. ' +
        'Get it right with no help and it counts.</p>' +
        '<button class="sc-twin-btn" onclick="scTwin()">Try one on your own &rarr;</button></div>'
      : "";

    host.innerHTML = '<div class="sc-panel">' + head + all + tail + '</div>';
    host.style.display = "block";
    renderMath(host);
  }

  /* 마이크로 스텝에서 하나 고름 */
  function scPick(letter) {
    if (!state.sc.live) return;
    var p = state.problem;
    var k = state.sc.at;
    if (k >= state.sc.list.length) return;
    if (state.sc.state[k] !== "open") return;
    if (state.sc.nanoAt >= 0) return;             /* 나노가 열려 있으면 부모는 잠긴다 */

    var s = p.steps[state.sc.list[k]];
    var a = s.ask;
    state.sc.picked = letter;

    if (letter === a.answer) {
      state.sc.state[k] = "got";
      scAdvance();
      return;
    }

    /* 처음 막힌 자리를 기억한다. 동형 문제가 여기로 되돌린다. */
    if (state.sc.blind < 0) state.sc.blind = state.sc.list[k];

    if (a.nano && a.nano.length) {
      /* 두 조건 규칙에 걸린 자리 — 진짜 스텝으로 더 쪼갠다 */
      state.sc.nanoAt = 0;
      state.sc.nanoState = a.nano.map(function (_, i) { return i === 0 ? "open" : "wait"; });
      scRender();
      return;
    }

    /* (가)안 — 한 문장 힌트를 띄우고 정답을 펴 보인 뒤 다음으로 간다.
       흐름을 끊지 않는다. */
    state.sc.state[k] = "shown";
    if (a.hint) {
      var s2 = p.steps[state.sc.list[k]];
      s2.__scHint = a.hint;
    }
    scAdvance();
  }

  /* 나노 스텝에서 하나 고름 */
  function scNano(letter) {
    if (!state.sc.live || state.sc.nanoAt < 0) return;
    var p = state.problem;
    var k = state.sc.at;
    var a = p.steps[state.sc.list[k]].ask;
    var i = state.sc.nanoAt;
    var n = a.nano[i];
    state.sc.nanoPicked = letter;

    state.sc.nanoState[i] = (letter === n.answer) ? "got" : "shown";

    if (i + 1 < a.nano.length) {
      state.sc.nanoAt = i + 1;
      state.sc.nanoState[i + 1] = "open";
      scRender();
      return;
    }

    /* 나노를 다 지났다. 나노들의 답이 곧 부모 스텝의 답이므로 부모를 펴 보인다. */
    state.sc.nanoAt = -1;
    state.sc.state[k] = "shown";
    scAdvance();
  }

  function scAdvance() {
    state.sc.at++;
    if (state.sc.at < state.sc.list.length) state.sc.state[state.sc.at] = "open";
    scRender();
    var host = el("sc-panel-host");
    if (host && host.scrollIntoView) host.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* 동형 문제로 간다. 같은 유형·같은 난이도의 **새 문제**다.
     progress.js 가 감싼 generateNewProblem 을 타야 helpUsedThisQ 와 타이머가
     제대로 초기화되고, 그 문제가 평범한 채점 경로를 그대로 밟는다. */
  function scTwin() {
    state.twin.pending = true;
    state.twin.blind = state.sc.blind;
    /* 같은 유형이라도 모양이 바뀌면 동형 문제가 아니다. 값을 치르는 문맥에서
       "작은 쪽이 이긴다"를 놓친 학생에게 물건이 나오는 문맥을 주면 막힌 자리를
       다시 묻지 못한다. 문항이 p.shape 를 주면 그 모양으로 다시 뽑게 한다. */
    state.twin.shape = (state.problem && state.problem.shape) || null;
    var gen = global.generateNewProblem || global.triggerNewQuestion || newProblem;
    gen();
  }

  /* ───────────────────────── 4. 문제 진행 ───────────────────────── */

  function newProblem() {
    var sel = selectEl();
    if (!sel || !state.generate) return;
    var typeId = sel.value;
    if (!typeId) return;

    /* 재시도 모드: 통과 못한 유형에서 벗어날 수 없다.
       드롭다운을 disabled 로 막지만, progress.js 나 키보드로 값이 바뀌는
       경로가 있어 여기서 한 번 더 되돌린다. */
    if (state.retry.on) {
      if (state.retry.halted) { retryPopup(state.problem); return; }
      var lock = state.retry.lockedType;
      if (lock && lock !== typeId) { sel.value = lock; typeId = lock; }
    }

    var p = dedupe(state.generate(typeId));
    if (!p) return;
    state.problem = p;
    state.quiz = {
      answered: false, selectedMcOption: "", isCorrect: false,
      currentStep: 0, solRevealed: false,
      selectedMethod: (p.methods && p.methods[0] ? p.methods[0].key : "ps"),
      attempts: 0
    };
    /* hasMethods 만 켜고 methods 목록을 빠뜨린 파일이 많다. 그대로 두면
       토글 바가 안 그려지고 필터도 안 걸려서 두 방법 단계가 한꺼번에 보인다.
       목록이 없으면 단계에 실제로 쓰인 mode 로 만들어 준다. */
    var ms = p.methods && p.methods.length ? p.methods : null;
    if (!ms && p.hasMethods) {
      var used = {};
      (p.steps || []).forEach(function (s) { if (s.mode && s.mode !== "common") used[s.mode] = 1; });
      var order = ["qf", "ps", "cc"];
      var lbl = { qf: "Quadratic Formula", ps: "Product &amp; Sum Method", cc: "Criss-Cross Matrix Method" };
      ms = order.filter(function (k) { return used[k]; })
               .map(function (k) { return { key: k, label: lbl[k] }; });
    }
    state.methods = ms || [];
    state.method = state.quiz.selectedMethod;

    /* progress.js 가 currentState / currentProblemData 를 들여다본다 */
    global.currentProblemData = p;
    global.currentState = state.quiz;
    global.currentMethod = state.method;

    if (el("placeholder")) el("placeholder").style.display = "none";
    if (el("quiz-station")) el("quiz-station").style.display = "block";
    if (el("solution-reveal-layer")) el("solution-reveal-layer").style.display = "none";
    if (el("method-toggle-bar")) el("method-toggle-bar").style.display = "none";
    if (el("hint-box")) el("hint-box").style.display = "none";
    if (el("feedback-msg")) el("feedback-msg").style.display = "none";

    /* 스캐폴딩은 문제마다 새로 시작한다. 앞 문제의 패널이 남아 있으면
       학생이 그 답을 보고 이 문제를 푼다. */
    if (state.sc.on) {
      scClear();
      state.twin.active = state.twin.pending;
      state.twin.pending = false;
      var flag = el("sc-twin-flag");
      if (state.twin.active) {
        if (!flag) {
          flag = document.createElement("div");
          flag.id = "sc-twin-flag";
          flag.className = "sc-twin-flag";
          var qs = el("quiz-station");
          if (qs) qs.insertBefore(flag, qs.firstChild);
        }
        flag.innerHTML = "<strong>Your turn.</strong> Same idea, new numbers, no help. " +
          "Get this one right first time and it counts towards mastery.";
        flag.style.display = "block";
      } else if (flag) {
        flag.style.display = "none";
      }
    }

    var assetMount = el("asset-viewport-mount-point");
    if (assetMount) {
      if (p.assetType && p.assetType !== "none") {
        assetMount.style.display = "flex";
        /* 자산을 만드는 방법이 유닛마다 다르다.
             Unit 1 : 문항이 p.assetHtml 에 HTML 을 직접 담는다
             Unit 4 : renderDynamicSVG(p.graphSpec) 처럼 별도 렌더러가 그린다
           그래서 assetHtml 이 없으면 등록된 렌더러에게 넘긴다. */
        var html = p.assetHtml;
        if (!html && state.renderAsset) { try { html = state.renderAsset(p); } catch (e) { html = ""; } }
        if (!html && state.assets[p.assetType]) {
          try { html = state.assets[p.assetType](p); } catch (e) { html = ""; }
        }
        assetMount.innerHTML = html || "";
      } else {
        assetMount.style.display = "none";
        assetMount.innerHTML = "";
      }
    }

    if (el("question-statement-display")) el("question-statement-display").innerHTML = rich(p.fullStatement);
    if (el("input-prompt-label")) el("input-prompt-label").innerHTML = rich(p.prompt);
    if (el("dynamic-input-mount-point")) el("dynamic-input-mount-point").innerHTML = buildOptionsHTML(p, "");

    paintMethodBar();
    unlockQuiz();
    retryPaint();
    renderMath();
  }

  function paintMethodBar() {
    var bar = el("method-toggle-bar");
    if (!bar) return;
    var ms = state.methods;
    /* 이전 문제의 버튼이 DOM 에 남아 있으면 안 된다. 숨기는 것만으로는 부족하다. */
    if (!ms.length) { bar.innerHTML = ""; bar.style.display = "none"; return; }
    bar.innerHTML = ms.map(function (m) {
      return '<button id="mode-' + m.key + '" class="method-btn' +
        (m.key === state.method ? " active" : "") +
        '" onclick="changeMethod(\'' + m.key + '\')">' + m.label + '</button>';
    }).join("");
  }

  function selectMcOptionCard(letter) {
    if (!state.problem || state.quiz.answered) return;
    state.quiz.selectedMcOption = letter;
    if (el("feedback-msg")) el("feedback-msg").style.display = "none";
    if (el("dynamic-input-mount-point")) {
      el("dynamic-input-mount-point").innerHTML = buildOptionsHTML(state.problem, letter);
    }
    renderMath();
  }

  function evaluateStudentAnswer() {
    if (!state.problem || state.quiz.answered) return;

    var first = el("first-name") ? el("first-name").value.trim() : "";
    var last = el("last-name") ? el("last-name").value.trim() : "";
    if (first === "" || last === "") { alert("Please enter your first and last name first."); return; }
    if (!state.quiz.selectedMcOption) { alert("Please choose an answer first."); return; }

    var correct = (state.quiz.selectedMcOption === state.problem.ans);

    state.attempts++;
    state.quiz.attempts++;
    if (correct && !state.quiz.isCorrect) state.score++;
    state.quiz.isCorrect = correct;

    if (el("hud-score")) el("hud-score").innerText = state.score;
    if (el("hud-attempts")) el("hud-attempts").innerText = state.attempts;

    if (state.retry.on) {
      var rsel = selectEl();
      var rtid = rsel ? rsel.value : "";
      var rec = retryRec(rtid);
      rec.tries++;
      if (correct) {
        rec.correct++;
        rec.streak = 0;
        if (retryNeed(rec) <= 0) { state.retry.lockedType = null; state.retry.lockedLevel = null; }
      } else {
        rec.wrong++;
        rec.streak++;
        state.retry.lockedType = rtid;
        state.retry.lockedLevel = state.retry.level || null;
      }
      /* 오답도 그 문제에서 확정된다. 다시 고를 수 없다. */
      state.quiz.answered = true;
      lockQuiz(correct);
      if (!correct) {
        var fb = el("feedback-msg");
        if (fb) {
          fb.innerHTML = "Not quite - read the steps below, then tap for a new " +
            "question of the <strong>same type</strong>. You now need <strong>" +
            retryNeed(rec) + "</strong> more correct to clear this type.";
        }
      }
      retryPaint();
      if (!correct && rec.streak >= 3) retryPopup(state.problem);
    } else if (state.sc.on && askList(state.problem).length) {
      /* 스캐폴딩이 붙은 유형. 오답은 그 자리에서 확정되고 마이크로 스텝이 열린다.
         다시 고르게 두면 A→B→C 로 훑어 정답에 닿을 수 있어서 "어디서 막혔나"가
         사라진다 — 그 자리가 곧 스캐폴딩의 시작 지점인데 말이다. */
      state.quiz.answered = true;
      lockQuiz(correct);
      if (!correct) {
        var fb2 = el("feedback-msg");
        if (fb2) fb2.innerHTML = "Not quite. Let us find the step where it went sideways.";
        /* 동형 문제에서 또 틀렸으면 앞서 막혔던 자리로 되돌린다. */
        var from = scRouteFor(state.problem, state.quiz.selectedMcOption);
        if (from < 0 && state.twin.active && state.twin.blind >= 0) from = state.twin.blind;
        scOpen(from);
      }
    } else {
      if (correct) { state.quiz.answered = true; lockQuiz(true); }
      else { showTryAgain(); }
    }

    /* 로깅은 부가 기능이다. fetch 가 없거나 실패해도 채점은 계속돼야 한다. */
    if (state.logUrl && typeof fetch === "function") {
      var sel = selectEl();
      var method = "";
      if (state.methods.length) {
        var m = state.methods.filter(function (x) { return x.key === state.method; })[0];
        method = m ? m.label : state.method;
      }
      try {
      fetch(state.logUrl, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: state.unitId, lessonId: state.lessonId,
          firstName: first, lastName: last,
          questionId: sel ? sel.value : "",
          userAnswer: "Option " + state.quiz.selectedMcOption,
          isCorrect: correct, attempts: state.quiz.attempts,
          methodUsed: method, totalScore: state.score
        })
      }).catch(function (e) { console.error("Database cloud logging failure:", e); });
      } catch (e) { console.error("Database cloud logging failure:", e); }
    }
  }

  function toggleHint() {
    if (!state.problem) return;
    var box = el("hint-box");
    if (!box) return;
    if (box.style.display === "block") { box.style.display = "none"; return; }
    /* hintFigure — 힌트를 눌렀을 때 비로소 나오는 그림.
       3D 응용 문제는 상황을 세우는 것 자체가 배울 것이라, 그림을 문제와 함께
       주면 남는 일이 계산뿐이다. 그래서 그림은 힌트로 내린다.
       (2026-08-22 추가. 이 필드를 쓰는 옛 파일이 없어 하위 호환이다.) */
    var hf = state.problem.hintFigure;
    box.innerHTML = "<strong>Hint:</strong> " + rich(state.problem.hint || "") +
      (hf ? '<div class="hint-figure">' +
        (Object.prototype.toString.call(hf) === "[object Array]" ? hf.join("") : hf) + '</div>' : "");
    box.style.display = "block";
    renderMath();
  }

  function showTryAgain() {
    if (el("reveal-sol-btn")) el("reveal-sol-btn").disabled = false;
    var f = el("feedback-msg");
    if (!f) return;
    f.style.display = "block";
    f.className = "feedback-msg-area feedback-error";
    f.innerHTML = "Not quite yet - pick another answer, or tap Hint for a clue. (You can tap Show Solution Steps any time.)";
  }

  function lockQuiz(isCorrect) {
    Array.prototype.forEach.call(document.querySelectorAll(".mc-option-card"),
      function (c) { c.classList.add("disabled"); });
    if (el("check-ans-btn")) el("check-ans-btn").disabled = true;
    if (el("reveal-sol-btn")) el("reveal-sol-btn").disabled = false;
    var f = el("feedback-msg");
    if (!f) return;
    f.style.display = "block";
    f.className = "feedback-msg-area " + (isCorrect ? "feedback-success" : "feedback-error");
    f.innerHTML = isCorrect ? "Correct! Nice work." : "Not quite - review the steps below.";
  }

  function unlockQuiz() {
    if (el("check-ans-btn")) el("check-ans-btn").disabled = false;
    if (el("reveal-sol-btn")) el("reveal-sol-btn").disabled = true;
    if (el("feedback-msg")) el("feedback-msg").style.display = "none";
  }

  /* ───────────────────── 5. 풀이 단계 + 방법 토글 ───────────────────── */

  function buildSolution() {
    var p = state.problem;
    var target = el("solution-workspace-injected");
    if (!target || !p) return;

    var html = "<h2>Solution for " + rich(p.title || "") + "</h2>";
    html += (p.steps || []).map(stepHTML).join("");
    if (p.rawAns || p.ansBox) {
      html += '<div class="final-answer-box">' +
        '<span class="final-answer-label">' + (p.finalLabel || "Final Answer") + '</span>' +
        '<span class="final-answer-math">' + wrapMath(p.ansBox || p.rawAns) + '</span></div>';
    }
    target.innerHTML = html;
  }

  function renderSteps() {
    var cont = el("solution-workspace-injected");
    if (!cont) return;
    var all = Array.prototype.slice.call(cont.querySelectorAll(".step-block, .final-answer-box"));
    all.forEach(function (s) { s.style.display = "none"; });

    state.steps = all.filter(function (s) {
      if (!state.methods.length) return true;
      for (var i = 0; i < state.methods.length; i++) {
        var k = state.methods[i].key;
        if (k !== state.method && s.classList.contains(k + "-only")) return false;
      }
      return true;
    });

    state.stepIndex = state.quiz.currentStep;
    if (state.stepIndex > state.steps.length - 1) state.stepIndex = state.steps.length - 1;
    if (state.stepIndex < 0) state.stepIndex = 0;
    state.quiz.currentStep = state.stepIndex;

    for (var i = 0; i <= state.stepIndex; i++) {
      if (state.steps[i]) state.steps[i].style.display = "block";
    }
    if (el("restart-btn")) el("restart-btn").disabled = (state.stepIndex === 0);
    if (el("next-btn")) el("next-btn").disabled = (state.stepIndex >= state.steps.length - 1);
  }

  function showNextStep() {
    if (state.stepIndex < state.steps.length - 1) {
      state.stepIndex++;
      state.quiz.currentStep = state.stepIndex;
      state.steps[state.stepIndex].style.display = "block";
      if (state.steps[state.stepIndex].scrollIntoView) {
        state.steps[state.stepIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      if (el("restart-btn")) el("restart-btn").disabled = false;
    }
    if (state.stepIndex >= state.steps.length - 1 && el("next-btn")) el("next-btn").disabled = true;
    renderMath();
  }

  function restartSolution() {
    state.quiz.currentStep = 0;
    renderSteps();
    renderMath();
  }

  function revealSolutionWorkspace() {
    buildSolution();
    if (el("solution-reveal-layer")) el("solution-reveal-layer").style.display = "block";
    if (state.methods.length && el("method-toggle-bar")) {
      el("method-toggle-bar").style.display = "flex";
      paintMethodBar();
    }
    renderSteps();
    renderMath();
  }

  function unlockSolutionPanel() {
    state.quiz.solRevealed = true;
    revealSolutionWorkspace();
  }

  function changeMethod(k) {
    if (state.method === k) return;
    state.method = k;
    state.quiz.selectedMethod = k;
    state.quiz.currentStep = 0;
    global.currentMethod = k;
    paintMethodBar();
    renderSteps();
    renderMath();
  }

  /* ───────────────────────── 6. 등록 ───────────────────────── */

  function init(cfg) {
    state.generate = cfg.generate;
    state.logUrl = cfg.logUrl || null;
    state.unitId = cfg.unitId || "";
    state.lessonId = cfg.lessonId || "";
    state.renderAsset = cfg.renderAsset || null;
    state.renderOption = cfg.renderOption || null;

    /* 재시도 엔진은 명시적으로 켠 파일에서만 돈다. 레거시 파일은 이 인자를
       주지 않으므로 v1 과 완전히 같은 경로를 탄다. */
    if (cfg.retry) {
      state.retry.on = true;
      state.retry.backUrl = cfg.backUrl || "";
      state.retry.backLabel = cfg.backLabel || "Back to the lesson";
    }
    /* 스캐폴딩도 명시적으로 켠 파일에서만 돈다. 안 켠 파일은 v2.0 그대로다.
       보스(retry)와는 겹치지 않게 둔다 — 보스는 이미 같은 유형을 다시 내는
       재시도 엔진을 갖고 있고, 그것이 동형 문제와 같은 일을 한다. */
    if (cfg.scaffold && !cfg.retry) {
      state.sc.on = true;
      scStyle();
    }

    /* 스타일과 ?type= 처리는 레슨 파일에도 필요하다 (팝업 링크의 착지점). */
    retryStyle();
    try { applyTypeFromURL(); } catch (e) { /* 링크 없이 연 경우 */ }
  }

  function registerAsset(name, fn) { state.assets[name] = fn; }

  /* progress.js 가 감싸는 전역들. progress.js 보다 먼저 로드되어야 한다. */
  global.generateNewProblem = newProblem;
  global.triggerNewQuestion = newProblem;
  global.selectMcOptionCard = selectMcOptionCard;
  global.evaluateStudentAnswer = evaluateStudentAnswer;
  global.unlockSolutionPanel = unlockSolutionPanel;
  global.revealSolutionWorkspace = revealSolutionWorkspace;
  global.showNextStep = showNextStep;
  global.restartSolution = restartSolution;
  global.changeMethod = changeMethod;
  global.toggleHint = toggleHint;
  global.dismissRetryHalt = dismissRetryHalt;
  global.scPick = scPick;
  global.scNano = scNano;
  global.scTwin = scTwin;
  MCF.applyTypeFromURL = applyTypeFromURL;
  MCF.askList = askList;
  /* 생성기가 문제를 만들기 직전에 부른다. 동형 문제를 뽑는 중이면 되풀이해야
     할 모양 이름이 나오고, 평소에는 null 이다. */
  MCF.twinShape = function () { return state.twin.pending ? state.twin.shape : null; };
  MCF.scRouteFor = scRouteFor;
  MCF.scReport = function () {   // 감사 하니스용. 화면에는 안 쓴다.
    return { on: state.sc.on, live: state.sc.live, at: state.sc.at,
             list: state.sc.list.slice(), state: state.sc.state.slice(),
             blind: state.sc.blind, nanoAt: state.sc.nanoAt,
             twin: { pending: state.twin.pending, active: state.twin.active,
                     blind: state.twin.blind } };
  };
  MCF.setRetryLevel = setRetryLevel;
  MCF.retryLockedLevel = function () { return state.retry.lockedLevel; };

  MCF.init = init;
  MCF.registerAsset = registerAsset;
  MCF.randInt = randInt;
  MCF.gcd = gcd;
  MCF.gcd3 = gcd3;
  MCF.pick = pick;
  MCF.shuffle = shuffle;
  MCF.M = M;
  MCF.signed = signed;
  MCF.Mu = Mu;
  MCF.rich = rich;
  MCF.fmtTerm = fmtTerm;
  MCF.key = key;
  MCF.factorKey = factorKey;
  MCF.uniqueByValue = uniqueByValue;
  MCF.spareOption = spareOption;
  MCF.shuffleMC = shuffleMC;
  MCF.dedupe = dedupe;
  MCF.METHODS_FACTORING = METHODS_FACTORING;
  MCF.METHODS_SOLVING = METHODS_SOLVING;
  MCF.factorable = factorable;
  MCF.noFactorStep = noFactorStep;
  MCF.splitPair = splitPair;
  MCF.renderMath = renderMath;
  MCF.newProblem = newProblem;
  MCF.CORE_VERSION = CORE_VERSION;
  MCF.retryReport = function () {   // 감사 하니스용. 화면에는 안 쓴다.
    return { on: state.retry.on, lockedType: state.retry.lockedType,
             halted: state.retry.halted, byType: state.retry.byType };
  };

  global.MCF = MCF;

  /* 옛 파일 호환: 이 이름들을 직접 부르던 문항 코드가 그대로 돌게 한다. */
  if (typeof global.randInt !== "function") global.randInt = randInt;
  if (typeof global.mcfPick !== "function") global.mcfPick = pick;
  if (typeof global.mcfRich !== "function") global.mcfRich = rich;
  if (typeof global.mcfKey !== "function") global.mcfKey = key;
  if (typeof global.mcfDedupe !== "function") global.mcfDedupe = dedupe;
  if (typeof global.mcfFactorKey !== "function") global.mcfFactorKey = factorKey;
  if (typeof global.mcfUniqueByValue !== "function") global.mcfUniqueByValue = uniqueByValue;

})(typeof window !== "undefined" ? window : globalThis);
