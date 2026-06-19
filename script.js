/* =========================================================
   여행 시작 전, 작은 선물 — 인터랙션 스크립트
   외부 라이브러리 없이 순수 JS로 구현
   ========================================================= */
(function () {
  "use strict";

  // 모션 최소화 선호 여부 — 꽃잎/일부 모션을 줄이는 데 사용
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* =======================================================
     1) REVEAL — Intersection Observer 기반 등장 애니메이션
     화면에 들어오면 .is-visible 부여 (한 번만)
     ======================================================= */
  function initReveal() {
    const items = document.querySelectorAll(".reveal");

    // 옵저버 미지원 환경 폴백: 즉시 모두 표시
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // 1회성
          }
        });
      },
      {
        // 화면 하단에서 살짝 일찍 트리거 → 자연스러운 등장
        threshold: 0.12,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    items.forEach((el) => io.observe(el));
  }

  /* =======================================================
     2) PETALS — 은은한 배경 꽃잎
     성능을 위해 적은 수만 생성, 60fps 유지 위해 transform만 사용
     ======================================================= */
  function initPetals() {
    if (reduceMotion) return;

    const field = document.getElementById("petalField");
    if (!field) return;

    // 청량한 여름 팔레트 (바다거품/하늘/모래/연꽃 톤)
    const colors = ["#bfe3dc", "#cfe7ec", "#eadcc4", "#a9d6cc", "#f3dcc6"];

    // 화면 크기에 따라 개수 조절 (모바일은 더 적게)
    const count = window.innerWidth < 600 ? 9 : 14;

    for (let i = 0; i < count; i++) {
      const petal = document.createElement("span");
      petal.className = "petal";

      const size = 9 + Math.random() * 12;        // 9~21px
      const left = Math.random() * 100;           // 가로 위치 %
      const dur = 12 + Math.random() * 12;        // 12~24s 낙하
      const delay = -Math.random() * 20;          // 음수 지연 → 시작부터 분산
      const drift = (Math.random() - 0.5) * 160;  // 좌우 흔들림
      const op = 0.28 + Math.random() * 0.3;      // 은은한 투명도

      petal.style.left = left + "%";
      petal.style.width = size + "px";
      petal.style.height = size + "px";
      petal.style.setProperty("--dur", dur + "s");
      petal.style.setProperty("--delay", delay + "s");
      petal.style.setProperty("--drift", drift + "px");
      petal.style.setProperty("--maxop", op.toFixed(2));
      petal.style.setProperty(
        "--petal-color",
        colors[i % colors.length]
      );

      field.appendChild(petal);
    }
  }

  /* =======================================================
     3) CHECKLIST — localStorage 저장 / 복원 / 진행도
     ======================================================= */
  function initChecklist() {
    const STORAGE_KEY = "gyeongju_trip_mission_v2";
    const boxes = document.querySelectorAll('#checklist input[type="checkbox"]');
    const progressEl = document.getElementById("progress");
    const fillEl = document.getElementById("progressFill");
    const barEl = document.querySelector("#mission .progress__bar");
    const petalField = document.getElementById("petalField");
    if (!boxes.length) return;

    // 진행바 최대값을 실제 항목 수에 맞춤 (항목 추가/삭제 시에도 어긋나지 않게)
    if (barEl) {
      barEl.setAttribute("aria-valuemax", String(boxes.length));
    }

    // 직전 완료 여부 — "전부 완료"로 새로 전환될 때만 보상 1회
    let wasComplete = false;

    // 저장된 상태 읽기 (방어적 파싱)
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      saved = {};
    }

    // 진행도 텍스트 갱신
    function updateProgress(fromUser) {
      const total = boxes.length;
      let done = 0;
      boxes.forEach((b) => {
        if (b.checked) done++;
      });

      const complete = done === total;

      if (progressEl) {
        // 전부 완료 시 따뜻한 멘트
        progressEl.textContent = complete
          ? "모든 미션 완료 — 행복한 여행 되자"
          : `${done} / ${total} 완료`;
      }

      // 게이지 바 채우기 + 접근성 값 갱신
      if (fillEl) {
        fillEl.style.width = Math.round((done / total) * 100) + "%";
      }
      if (barEl) {
        barEl.setAttribute("aria-valuenow", String(done));
        // 스크린리더가 "3 / 10 완료"처럼 읽도록 텍스트 값도 갱신
        barEl.setAttribute("aria-valuetext", `${done} / ${total} 완료`);
      }

      // 사용자가 직접 체크해서 "방금" 전부 완료된 순간에만 보상 1회
      if (complete && !wasComplete && fromUser && petalField && !reduceMotion) {
        spawnBurst(petalField);
      }
      wasComplete = complete;
    }

    // 현재 상태 저장
    function save() {
      const state = {};
      boxes.forEach((b) => {
        state[b.dataset.key] = b.checked;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        /* 저장 실패해도 동작은 유지 */
      }
    }

    // 초기 복원 + 이벤트 연결
    boxes.forEach((box) => {
      const key = box.dataset.key;
      if (saved[key]) box.checked = true;

      box.addEventListener("change", () => {
        save();
        updateProgress(true); // 사용자 동작 → 완료 시 보상 허용
      });
    });

    updateProgress(false); // 초기 복원: 보상 연출 없이 상태만 반영
  }

  /* =======================================================
     4) FINAL BURST — 최하단 도달 시 꽃잎 한 번 재생
     마지막 메시지/푸터가 보이면 1회만 트리거
     ======================================================= */
  function initFinalBurst() {
    if (reduceMotion) return;

    const trigger = document.querySelector(".footer");
    const field = document.getElementById("petalField");
    if (!trigger || !field || !("IntersectionObserver" in window)) return;

    let played = false;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !played) {
            played = true;
            spawnBurst(field);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );

    io.observe(trigger);
  }

  // 꽃잎 버스트 생성 — 재생 후 자동 제거
  function spawnBurst(field) {
    const colors = ["#9fd4c8", "#bfe3dc", "#eccfa6", "#cfe7ec", "#f0d2b4"];
    const count = 18;

    for (let i = 0; i < count; i++) {
      const petal = document.createElement("span");
      petal.className = "petal petal--burst";

      const size = 10 + Math.random() * 14;
      const left = Math.random() * 100;
      const drift = (Math.random() - 0.5) * 220;
      const delay = Math.random() * 0.8;

      petal.style.left = left + "%";
      petal.style.width = size + "px";
      petal.style.height = size + "px";
      petal.style.setProperty("--drift", drift + "px");
      petal.style.animationDelay = delay + "s";
      petal.style.setProperty("--petal-color", colors[i % colors.length]);

      field.appendChild(petal);

      // 애니메이션 종료 후 DOM 정리
      petal.addEventListener("animationend", () => petal.remove());
    }
  }

  /* =======================================================
     5) LETTER — 편지가 한 줄씩 써내려가는 연출
     · 첫 인사: 한 글자씩 타이핑
     · 나머지 문단: 위에서부터 순차 페이드인
     카드가 화면에 들어오면 1회 재생
     ======================================================= */
  function initLetter() {
    const card = document.querySelector("#message .glass");
    if (!card) return;

    const lines = Array.prototype.slice.call(card.querySelectorAll("p"));
    const greeting = card.querySelector(".message__hi[data-typing]");
    const greetingText = greeting ? greeting.textContent.trim() : "";

    // 모션 최소화 / 옵저버 미지원 → 연출 없이 그대로 표시
    if (reduceMotion || !("IntersectionObserver" in window)) {
      return;
    }

    // 시작 전 숨김 처리 (첫 인사는 글자 비우기)
    lines.forEach((p) => p.classList.add("letter-line"));
    if (greeting) greeting.textContent = "";

    let started = false;
    const stagger = 480; // 문단 간 등장 간격(ms)

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started) {
            started = true;
            playLetter(lines, greeting, greetingText, stagger);
            io.disconnect();
          }
        });
      },
      // 카드 상단이 화면 하단에서 12% 올라오면 트리거.
      // threshold를 0으로 두어 카드가 뷰포트보다 훨씬 길어도 반드시 발동.
      { threshold: 0, rootMargin: "0px 0px -12% 0px" }
    );

    io.observe(card);
  }

  // 문단을 차례로 등장시키고, 첫 인사 줄에서 타이핑 재생
  function playLetter(lines, greeting, greetingText, stagger) {
    lines.forEach((p, idx) => {
      setTimeout(() => {
        p.classList.add("is-in");
        // 첫 인사 문단이 떠오르는 순간 타이핑 시작
        if (p === greeting) {
          typeOut(greeting, greetingText);
        }
      }, idx * stagger);
    });
  }

  // 글자를 하나씩 채우고, 끝나면 커서 제거
  function typeOut(el, text) {
    el.textContent = "";
    el.classList.add("is-typing");

    let i = 0;
    const speed = 130; // ms/글자 — 잔잔한 속도

    (function tick() {
      el.textContent = text.slice(0, i);
      i++;
      if (i <= text.length) {
        setTimeout(tick, speed);
      } else {
        // 마지막에 커서 잠깐 깜빡이다 사라지게
        setTimeout(() => el.classList.remove("is-typing"), 900);
      }
    })();
  }

  /* =======================================================
     6) 부드러운 앵커 스크롤 (스크롤 유도 아이콘)
     CSS scroll-behavior 폴백 겸용
     ======================================================= */
  function initSmoothAnchor() {
    const cue = document.querySelector(".scroll-cue");
    if (!cue) return;

    cue.addEventListener("click", (e) => {
      const targetId = cue.getAttribute("href");
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  /* =======================================================
     INIT — DOM 준비 후 일괄 실행
     ======================================================= */
  function init() {
    initReveal();
    initPetals();
    initChecklist();
    initFinalBurst();
    initLetter();
    initSmoothAnchor();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
