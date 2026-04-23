/**
 * Hook to handle character sheet rendering.
 * Injects the spellcasting trait label into the character details if the setting is enabled and the trait exists.
 */
Hooks.on("renderCharacterSheet", (app, html, data) => {
  if (
    data.document.system.spellcastModifierTrait?.key &&
    game.settings.get('daggerheart-kichwas-ui-refinement', 'moveSpellcastingTrait')
  ) {
    const spellcastHtml = `
      <span class="kichwas-ui-refinement">
        <span class="dot">•</span>
        <span class="spellcasting-trait"
          title="${game.i18n.localize('DAGGERHEART.ITEMS.Subclass.spellcastingTrait')}: ${data.document.system.spellcastModifierTrait.key}"
          data-action="rollAttribute"
          data-attribute="${data.document.system.spellcastModifierTrait.key}"
          data-value="${data.document.system.spellcastModifierTrait.value}">
          <i class="fa-solid fa-wand-sparkles"></i>
          ${game.i18n.localize(`DAGGERHEART.CONFIG.Traits.${data.document.system.spellcastModifierTrait.key}.short`)}
        </span>
      </span>
    `;

    const characterDetails = html.querySelector(".character-details");

    if (characterDetails) {
      const spans = characterDetails.querySelectorAll("span");
      const lastSpan = spans[spans.length - 1];

      if (lastSpan) {
        lastSpan.insertAdjacentHTML("afterend", spellcastHtml);
      }
    }

    const iconsList = html.querySelector(".icons-list");
    if (iconsList && !iconsList.classList.contains("kichwas-ui-refinement-hide-icon")) {
      iconsList.classList.add("kichwas-ui-refinement-hide-icon");
    }
  }
});

/**
 * Applies patches to lock the fear tracker elements in place.
 * Got really complicated dealing with making it work onto another mod.
 * If we just wanted to lock the base fear tracker most of this wouldn't be needed.
 */
const applyFearTrackerPatch = () => {
  const baseFear = document.querySelector("#resource-fear");
  const baseResources = baseFear?.closest("#resources");

  if (baseResources) {
    baseResources.classList.add("kichwas-ui-refinement-lock-tracker");
  }

  const fearTrackerPlus = document.querySelector("#dh-feartrackerplus-app");

  if (fearTrackerPlus) {
    fearTrackerPlus.classList.add("kichwas-ui-refinement-lock-ftp-tracker");
  }
};

/**
 * MutationObserver - nothing worked to inject into another mod other than this.
 */
const observer = new MutationObserver(applyFearTrackerPatch);

/**
 * Initializes the fear tracker patch observer when the game is ready.
 * Because we're waiting on another mod in order to patch it, everything has to be
 * loaded and done, then we mess with it.
 */
Hooks.once("ready", () => {
  if (game.settings.get('daggerheart-kichwas-ui-refinement', 'lockFearTacker')) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    applyFearTrackerPatch();
  }
});

/* ******************************************************************************************** */

/**
 * Registers module settings on game initialization.
 */
Hooks.once('init', () => {
  game.settings.register('daggerheart-kichwas-ui-refinement', 'moveSpellcastingTrait', {
    name: 'Move Spellcasting Trait',
    hint: 'Show Spellcasting Trait on sheet instead of covering artwork.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      refreshActorSheets();
    }
  });

  game.settings.register('daggerheart-kichwas-ui-refinement', 'lockFearTacker', {
    name: 'Lock Fear Tracker',
    hint: 'Lock Fear Tracker in place.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      Hooks.callAll("kichwas:settingsChanged")
    }
  });
});

/*
 * Handles changes to module settings by reloading the page.
 * I tried everything I could to avoid a window reload but it was the only thing that took.
 */

function refreshActorSheets() {
  window.location.reload();
}

Hooks.on("kichwas:settingsChanged", () => {
  window.location.reload();
});

