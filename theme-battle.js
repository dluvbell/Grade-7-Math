/* ============================================================================
   theme-battle.js  —  the fighting world  (v1, 2026-08-06)

   What a theme file is:
     progress.js is theme-neutral. It knows how to run a challenge, count
     stars, track mastery and keep a streak, but it does not know what any
     of that is *called*. A theme file supplies the words.

   How it loads:
     progress.js reads mcf3m.v1.meta.theme, then loads theme-<id>.js from
     its own folder and waits for it before booting. Lesson files never
     mention this file, so adding a theme costs zero edits to the 18
     question files. With the farm gone this is the only theme shipped and
     the default, so nobody is ever asked to pick one.

   What it may and may not change:
     may  — every label, every price, every description
     may  — which of the four items a world sells and what they are called
     not  — boss hp, par, reward, damage, mastery rules, star rates
   Balance stays in the engine on purpose. A reskin must never be able to
   make the mathematics easier by accident.

   Anything left out falls back to the engine's built-in battle defaults,
   so a half-written theme file still produces a working portal.
   ========================================================================== */

window.MCF3M_THEME = {
    id: "battle",
    name: "Battle",

    ui: {
        stars: "stars earned",

        shopHead: "SHOP \u2014 SPEND YOUR STARS",
        shopNote: "Take these into a boss fight. Hints and solution steps can also be bought mid-fight.",

        bagHead: "BAG \u2014 WHAT YOU ARE CARRYING",
        bagNote: "Items are spent automatically when they apply. Buy more in the shop.",
        bagEmpty: "Nothing here yet. Anything you buy in the shop shows up here.",

        tabShop: "Shop",
        tabBag: "Bag",
        tabTroph: "Trophies",
        tabBadge: "Badges",
        tabCode: "Save code"
    },

    boss: {
        lesson: "Lesson Boss",
        unit: "Unit Boss",
        final: "Final Boss",
        stand: "LAST STAND",
        retreat: "Retreat",
        tiring: "boss is tiring (double damage)",
        retreatAsk: "Retreat? The boss heals back to full, but you keep every star you have."
    },

    /* The four ids are fixed because their effects are wired into the fight.
       A world renames and reprices them; it does not invent new ones here.
       Battle is the only world shipping today; the loader still supports a
       second one, so this file is a template as much as a theme. */
    shop: {
        powerCore: {
            name: "Power Core",
            cost: 60,
            desc: "Double damage for your next 3 questions."
        },
        secondWind: {
            name: "Second Wind",
            cost: 80,
            desc: "Turns one missed question back into a first-try hit."
        },
        starLens: {
            name: "Star Lens",
            cost: 100,
            desc: "Doubles the stars you win from this boss."
        },
        streakFreeze: {
            name: "Streak Freeze",
            cost: 120,
            desc: "Miss a day without losing your streak. 7-day cooldown."
        }
    }
};
