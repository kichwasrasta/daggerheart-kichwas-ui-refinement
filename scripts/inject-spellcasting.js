/**
 * Handle character sheet rendering and inject the spellcasting trait label.
 *
 * @param app - The rendered Application instance.
 * @param html - The rendered HTML of the sheet.
 * @param data - The data context used for rendering.
 */
Hooks.on("renderCharacterSheet", (app, html, data) => {
  if (data.document.system.spellcastModifierTrait?.key) {
    const spellcastHtml = `
      <span class="dot">•</span>
      <span class="spellcasting-trait">
        <i title="${game.i18n.localize('DAGGERHEART.ITEMS.Subclass.spellcastingTrait')}" class="fa-solid fa-wand-sparkles"></i>
        ${game.i18n.localize(`DAGGERHEART.CONFIG.Traits.${data.document.system.spellcastModifierTrait.key}.short`)}
      </span>
    `;

    const characterDetails = html.querySelector(".character-details");
    if (characterDetails) {
      const allSpans = characterDetails.querySelectorAll("span");
      const lastSpan = allSpans[allSpans.length - 1];

      if (lastSpan) {
        lastSpan.insertAdjacentHTML('afterend', spellcastHtml);
      }
    }
  }
});