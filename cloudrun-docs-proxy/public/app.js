const commandLabel = document.getElementById('command-label');
const terminalOutput = document.getElementById('terminal-output');

const commandFrames = [
  {
    label: 'rook leaderboard --watch',
    body: `$ rook leaderboard --watch

# Global Leaderboard
1  chroma-ops       lvl 24   17640 XP   11 achievements
2  tarun            lvl 22   15290 XP    9 achievements
3  infra-guild      lvl 21   14920 XP    8 achievements

> realtime event: battle:update vs chroma-ops
> realtime event: loot Golden Flame x1
> realtime event: leaderboard:update +220 XP`
  },
  {
    label: 'rook stats',
    body: `$ rook stats

Level 22  Master Developer
[==================------] 76%
Total XP: 15290
Quest Streak: 14 days (+10% XP, +1 extra loot)
Guild Bonus: +6%
Prestige: 3 (+6% XP total)

Recent Loot:
+ Insight Crystal
+ Bugfix Shard
+ Golden Flame`
  },
  {
    label: 'rook dungeon',
    body: `$ rook dungeon

Daily Quests
✓ Make 3 commits
✓ Open 1 PR
⚔ Review 2 PRs    1 / 2
✓ Close 1 issue
✓ Maintain your streak

Weekly Bosses
⚔ Merge 3 PRs this week   2 / 3
⚔ Earn 1000 XP this week  820 / 1000`
  }
];

let frameIndex = 0;
let terminalTimer;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function renderCommandFrame() {
  const frame = commandFrames[frameIndex];
  commandLabel.textContent = frame.label;

  if (terminalTimer) {
    window.clearTimeout(terminalTimer);
  }

  if (prefersReducedMotion) {
    terminalOutput.textContent = frame.body;
  } else {
    terminalOutput.textContent = '';
    let charIndex = 0;

    const typeNextCharacter = () => {
      terminalOutput.textContent = frame.body.slice(0, charIndex);
      charIndex += 3;

      if (charIndex <= frame.body.length) {
        terminalTimer = window.setTimeout(typeNextCharacter, 18);
      }
    };

    typeNextCharacter();
  }

  frameIndex = (frameIndex + 1) % commandFrames.length;
}

renderCommandFrame();
setInterval(renderCommandFrame, 3200);

const counters = document.querySelectorAll('[data-count]');

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const target = Number(entry.target.getAttribute('data-count') || '0');
    const durationMs = 1200;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / durationMs);
      entry.target.textContent = String(Math.round(target * progress));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
    counterObserver.unobserve(entry.target);
  });
});

counters.forEach((counter) => counterObserver.observe(counter));

const modeButtons = document.querySelectorAll('.mode-button');
const modePanels = document.querySelectorAll('.mode-panel');

function revealElements() {
  const revealTargets = document.querySelectorAll(
    '.hero-copy, .hero-panel, .section-heading, .feature-card, .mode-picker, .mode-panel, .rail-card, .faq-grid details, .site-footer'
  );

  revealTargets.forEach((target) => target.classList.add('reveal'));

  if (prefersReducedMotion) {
    revealTargets.forEach((target) => target.classList.add('visible'));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.18 }
  );

  revealTargets.forEach((target) => revealObserver.observe(target));
}

revealElements();

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const selectedMode = button.dataset.mode;
    const activePanel = Array.from(modePanels).find((panel) => panel.dataset.panel === selectedMode);

    modeButtons.forEach((item) => item.classList.toggle('active', item === button));
    modePanels.forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === selectedMode));

    if (activePanel && !prefersReducedMotion) {
      activePanel.classList.add('visible');
      activePanel.animate(
        [
          { opacity: 0, transform: 'translateY(16px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ],
        { duration: 260, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
      );
    }
  });
});
