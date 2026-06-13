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
  const positionX =
    game.settings.get(
      "daggerheart-kichwas-ui-refinement",
      "PositionHorizontalFearTacker"
    );
  const positionY =
    game.settings.get(
      "daggerheart-kichwas-ui-refinement",
      "PositionVerticalFearTacker"
    );
  const fontSize = game.settings.get(
    "daggerheart-kichwas-ui-refinement",
    "FearTackerFontSize"
    );


  if (baseResources) {
    baseResources.classList.add("kichwas-ui-refinement-lock-tracker");
    baseResources.style.left = `${positionX}%`;
    baseResources.style.top = `${positionY}%`;
    baseResources.style.transform =
      `translateX(-${100 - positionX}%)`;
  }

  const fearTrackerPlus = document.querySelector("#dh-feartrackerplus-app");

  if (fearTrackerPlus) {
    fearTrackerPlus.classList.add("kichwas-ui-refinement-lock-ftp-tracker");
    fearTrackerPlus.style.left = `${positionX}%`;
    fearTrackerPlus.style.top = `${positionY}%`;
    fearTrackerPlus.style.transform =
      `translateX(-${100 - positionX}%)`;
  }

baseResources.style.setProperty(
  "--kichwas-fear-font-size",
  `${fontSize}px`
);


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
    name: 'Optional Spellcasting Trait Display',
    hint: 'Show Spellcasting Trait on character sheet details.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      refreshActorSheets();
    }
  });

  game.settings.register('daggerheart-kichwas-ui-refinement', 'lockFearTacker', {
    name: 'Lock Fear Tracker',
    hint: 'Lock Fear Tracker in place.',
    restricted: true,
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      Hooks.callAll("kichwas:settingsChanged")
    }
  });

  game.settings.register('daggerheart-kichwas-ui-refinement', 'PositionHorizontalFearTacker', {
    name: "Horizontal position of Fear Tracker",
    hint: 'Percent of screen from the left edge at which to center the fear tracker', // Setting description
    scope: 'client',
    config: true,
    range: {
      min: 5,
      max: 100,
      step: 5,
    },
    default: 50, // Default Value
    type: Number, // Value type
  });

  game.settings.register('daggerheart-kichwas-ui-refinement', 'PositionVerticalFearTacker', {
    name: "Vertical position of Fear Tracker",
    hint: 'Percent of screen from the top edge at which to center the fear tracker', // Setting description
    scope: 'client',
    config: true,
    range: {
      min: 0,
      max: 100,
      step: 1,
    },
    default: 1, // Default Value
    type: Number, // Value type
  });

  game.settings.register('daggerheart-kichwas-ui-refinement', 'FearTackerFontSize', {
    name: "Font Size of Fear Tracker",
    hint: 'Size of the font used in the fear tracker', // Setting description
    scope: 'client',
    config: true,
    range: {
      min: 5,
      max: 30,
      step: 1,
    },
    default: 10, // Default Value
    type: Number, // Value type
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

