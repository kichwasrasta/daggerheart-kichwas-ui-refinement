/* daggerheart-kichwas-ui-refinement: GM dice override enhancements
   - Patches D20RollDialog to add GM-only die value override controls
   - ToDo: The same functionality for d20 rolls, damage rolls, and player rolls.
   - But player rolls will need a 'cheat active' chat message.
   Note: This file performs runtime monkeypatching and is loaded after the system.
*/

(() => {
  const patchD20RollDialogActions = (dialogClass) => {
    if (!dialogClass || patchD20RollDialogActions.patched) return;

    const actions = dialogClass.DEFAULT_OPTIONS?.actions;
    if (!actions) return;
    if (!actions.toggleOverride) {
      actions.toggleOverride = function (_event, button) {
        this.overrideDice ??= { hope: false, fear: false };
        const dieType = button?.dataset?.dieType;
        if (!dieType) return;
        this.overrideDice[dieType] = !this.overrideDice[dieType];
        this.render();
      };
    }
    if (!dialogClass.__kichwasUpdateRollConfigurationPatched) {
      const originalUpdateRollConfiguration = dialogClass.updateRollConfiguration;
      dialogClass.updateRollConfiguration = function (_event, _, formData) {
        const rollDice = formData.object?.roll?.dice;
        if (rollDice) {
          this.config.roll ??= {};
          this.config.roll.override ??= {};

          for (const dieKey of ["dHope", "dFear"]) {
            const overrideKey = DIE_MAP[dieKey];

            const override =
              rollDice[`${dieKey}Override`];

            if (override != null) {
              setOverride(
                this,
                overrideKey,
                Number(String(override).replace(/\D/g, ""))
              );

              delete rollDice[`${dieKey}Override`];
            }

            if (
              this.overrideDice?.[overrideKey] === false
            ) {
              setOverride(this, overrideKey, null);
            }

            const dieValue = rollDice[dieKey];

            if (dieValue != null) {
              let normalized =
                normalizeDieValue(dieValue);

              if (
                typeof normalized === "string" &&
                !normalized.startsWith("d")
              ) {
                normalized = `d${normalized}`;
              }

              this.roll[dieKey] = normalized;

              delete rollDice[dieKey];
            }
          }
        }
        return originalUpdateRollConfiguration.call(this, _event, _, formData);
      };
      dialogClass.__kichwasUpdateRollConfigurationPatched = true;
    }
    patchD20RollDialogActions.patched = true;
  };


/* Shared Helpers */

const getFocusedOverrideInput = html =>
  html.querySelector('.kichwas-override-value:focus')
  ?? document.activeElement;

const DIE_MAP = {
  dHope: "hope",
  dFear: "fear"
};

const VALID_D12_VALUES =
  Array.from({ length: 12 }, (_, i) => i + 1);

const getFaces = select =>
  Number(select.value.replace(/\D/g, "")) || 12;

function normalizeDieValue(value) {
  let result = value;

  if (typeof result === "object" && result) {
    result =
      result.faces ??
      result.denomination ??
      result.value ??
      result;
  }

  if (typeof result?.valueOf === "function") {
    result = result.valueOf();
  }

  return result;
}

function ensureOverride(app) {
  app.config.roll ??= {};
  app.config.roll.override ??= {};
  return app.config.roll.override;
}

function setOverride(app, dieType, value) {
  const override = ensureOverride(app);

  if (Number.isFinite(value)) {
    override[dieType] = value;
  } else {
    delete override[dieType];
  }

  if (!Object.keys(override).length) {
    delete app.config.roll.override;
  }
}


function getValidOverride(input, maxFaces) {
  input.value = input.value.replace(/\D/g, "");

  let value = Number(input.value);

  if (value > maxFaces) {
    value = maxFaces;
    input.value = String(maxFaces);
  }

  return Number.isFinite(value) &&
         value >= 1 &&
         value <= maxFaces
    ? value
    : null;
}

function applyFixedValue(term, value) {
  const normalized = Number(value);

  if (!Number.isFinite(normalized)) {
    return false;
  }

  const maxFaces =
    term.faces ??
    term._faces ??
    null;

  if (
    maxFaces &&
    (normalized < 1 || normalized > maxFaces)
  ) {
    return false;
  }

  term.results = [{
    result: normalized,
    active: true,
    discarded: false,
    rerolled: false
  }];

  term.total = normalized;

  if ("_total" in term) {
    term._total = normalized;
  }

  if ("_values" in term) {
    term._values = [normalized];
  }

  term._evaluated = true;
  term._forcedResult = normalized;

  return true;
}

function updateOverrideUI(
  diceEl,
  select,
  app,
  dieType,
  overrideEnabled
) {
  const existingInput =
    diceEl.querySelector('.kichwas-override-value');

  const existingChip =
    diceEl.querySelector('.kichwas-override-chip');

  const currentFaces = getFaces(select);

  const savedOverride =
    app.config?.roll?.override?.[dieType] ??
    currentFaces;

  if (existingInput) {
    existingInput.name =
      `roll.dice.d${dieType.charAt(0).toUpperCase() + dieType.slice(1)}Override`;

    existingInput.max = String(currentFaces);
    existingInput.value = String(savedOverride);

    existingInput.classList.toggle(
      'kichwas-override-hidden',
      !overrideEnabled
    );

    existingInput.disabled = !overrideEnabled;
  }

  if (existingChip) {
    existingChip.classList.toggle(
      'selected',
      overrideEnabled
    );
  }

  select.classList.toggle(
    'kichwas-override-hidden',
    overrideEnabled
  );

  select.disabled = overrideEnabled;
}

/* End Shared Helpers */

  // Hook into ApplicationV2 render to patch dialogs dynamically
  Hooks.on('renderApplicationV2', (app, html, data) => {
    // Check if this is a D20RollDialog (duality roll)

    if (app.constructor?.name?.includes('D20RollDialog')) {
      if (!game.user.isGM || !game.settings.get('daggerheart-kichwas-ui-refinement', 'cheatDieRolls')) return;

      patchD20RollDialogActions(app.constructor);
      const DualityRollClass = game?.system?.api?.dice?.DualityRoll ?? CONFIG.Dice.daggerheart?.DualityRoll;
      if (DualityRollClass && !DualityRollClass.prototype.__kichwasGetFacesFixed) {
        const originalGetFaces = DualityRollClass.prototype.getFaces;
        DualityRollClass.prototype.getFaces = function (faces) {
          if (typeof faces === 'number') return faces;
          let normalized = normalizeDieValue(faces);
          if (typeof normalized !== 'string') {
            if (normalized?.valueOf && typeof normalized.valueOf === 'function') {
              normalized = normalized.valueOf();
            }
            normalized = String(normalized);
          }
          normalized = normalized.trim();
          const result = originalGetFaces.call(this, normalized);
          return Number.isFinite(result) ? result : 12;
        };
        DualityRollClass.prototype.__kichwasGetFacesFixed = true;
      }

      if (foundry?.dice?.terms?.Die && !foundry.dice.terms.Die.prototype.__kichwasForceEvaluatePatched) {
        const originalDieEvaluate = foundry.dice.terms.Die.prototype.evaluate;
        foundry.dice.terms.Die.prototype.evaluate = function (options) {
          if (Number.isFinite(this._forcedResult)) {
            const normalized = Number(this._forcedResult);
            const forced = {
              result: normalized,
              active: true,
              discarded: false,
              rerolled: false
            };
            this.results = [forced];
            this.total = normalized;
            if ('_total' in this) this._total = normalized;
            if ('_values' in this) this._values = [normalized];
            this._evaluated = true;
            return this;
          }
          return originalDieEvaluate.call(this, options);
        };
        foundry.dice.terms.Die.prototype.__kichwasForceEvaluatePatched = true;
      }

      if (DualityRollClass && !DualityRollClass.__kichwasBuildEvaluatePatched) {
        const originalBuildEvaluate = DualityRollClass.buildEvaluate;
        DualityRollClass.buildEvaluate = async function (roll, config = {}, message = {}) {

          const applyOverrides = () => {
            const overrides = config.roll?.override;
            if (!overrides) return;

            const terms = {
              hope: roll.dHope ?? roll.dice?.[0],
              fear: roll.dFear ?? roll.dice?.[1]
            };

            for (const [type, value] of Object.entries(overrides)) {
              const term = terms[type];
              if (term) {
                applyFixedValue(term, value);
              }
            }
          };

          applyOverrides();

          await originalBuildEvaluate.call(
            this,
            roll,
            config,
            message
          );

          if (config.roll?.override) {
            applyOverrides();

            if (roll.dHope) roll.dHope._evaluated = true;
            if (roll.dFear) roll.dFear._evaluated = true;

            roll._evaluated = true;

            roll.total = Number(roll.dHope?.total ?? 0) + Number(roll.dFear?.total ?? 0) + Number(roll.dAdvantage?.total ?? 0) + Number(roll.dRally?.total ?? 0);
            try {
              config.roll = this.postEvaluate(roll, config);
              config.roll.result = config.roll.result ?? {};
              config.roll.result.total = roll.total;
              config.roll.result.duality = roll.withHope ? 1 : roll.withFear ? -1 : 0;
            } catch (err) {
              console.warn('kichwas die value injection: failed to recompute roll after applying overrides', err);
            }
          }

          return config;
        };
        DualityRollClass.__kichwasBuildEvaluatePatched = true;
      }

      if (DualityRollClass && !DualityRollClass.__kichwasPostEvaluatePatched) {
        const originalPostEvaluate = DualityRollClass.postEvaluate;
        DualityRollClass.postEvaluate = function (roll, config = {}) {
          const data = originalPostEvaluate.call(this, roll, config);
          if (config.roll?.override) {
            const hopeOverride = config.roll.override.hope;
            const fearOverride = config.roll.override.fear;
            if (hopeOverride != null && roll.dHope) {
              data.hope = data.hope ?? {};
              data.hope.value = Number(hopeOverride);
              data.hope.dice = roll.dHope.denomination;
            }
            if (fearOverride != null && roll.dFear) {
              data.fear = data.fear ?? {};
              data.fear.value = Number(fearOverride);
              data.fear.dice = roll.dFear.denomination;
            }

            data.result = data.result ?? {};
            const hopeValue = hopeOverride != null ? Number(hopeOverride) : Number(roll.dHope?.total ?? 0);
            const fearValue = fearOverride != null ? Number(fearOverride) : Number(roll.dFear?.total ?? 0);
            data.result.total = hopeValue + fearValue;
            data.result.duality = hopeValue > fearValue ? 1 : hopeValue < fearValue ? -1 : 0;
          }
          return data;
        };
        DualityRollClass.__kichwasPostEvaluatePatched = true;
      }

      if (!document.getElementById('kichwas-die-value-list')) {
        const dieList = document.createElement('datalist');
        dieList.id = 'kichwas-die-value-list';
        VALID_D12_VALUES.forEach((value) => {
          const option = document.createElement('option');
          option.value = String(value);
          dieList.appendChild(option);
        });
        document.body.appendChild(dieList);
      }

      const diceSection = html.querySelector('.dices-section');
      const rollForm = html.querySelector('form');
      if (rollForm && !rollForm.dataset.kichwasOverrideSubmitPatched) {
        const commitFocusedOverrideInput = () => {
          const activeInput = getFocusedOverrideInput();
          if (!activeInput?.matches?.('input.kichwas-override-value')) return;
          const dieType = activeInput.dataset.dieType;
          const currentFaces = Number(activeInput.max) || 12;
          setOverride(
            app,
            dieType,
            getValidOverride(
              activeInput,
              currentFaces
            )
          );
        };
        const blurActiveOverrideInput = () => {
          commitFocusedOverrideInput();
          const activeInput = getFocusedOverrideInput();
          if (activeInput?.matches?.('input.kichwas-override-value')) activeInput.blur();
        };
        rollForm.addEventListener('submit', blurActiveOverrideInput);
        ['pointerdown', 'mousedown', 'touchstart'].forEach((eventName) => {
          rollForm.addEventListener(eventName, (event) => {
            if (event.target.closest('input.kichwas-override-value')) return;
            blurActiveOverrideInput();
          }, true);
          html.addEventListener(eventName, (event) => {
            if (event.target.closest('input.kichwas-override-value')) return;
            blurActiveOverrideInput();
          }, true);
        });
        rollForm.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') blurActiveOverrideInput();
        }, true);
        rollForm.dataset.kichwasOverrideSubmitPatched = '1';
      }
      if (!diceSection) return;

      // Add GM checkboxes to Hope and Fear dice
      const diceOptions = diceSection.querySelectorAll('.dice-option');
      diceOptions.forEach((diceEl) => {
        const label = diceEl.querySelector('.label');
        if (!label) return;

        const text = label.textContent.trim().toLowerCase();

        const dieType =
          text.includes('hope')
            ? 'hope'
            : text.includes('fear')
              ? 'fear'
              : null;

        if (!dieType) return;

        const select = diceEl.querySelector('select');
        if (!select) return;

        const overrideEnabled = app.overrideDice?.[dieType] ?? false;

        // If already patched, update the existing elements instead of skipping
        if (select.dataset.kichwasPatched) {
          updateOverrideUI(
            diceEl,
            select,
            app,
            dieType,
            overrideEnabled
          );
          return;
        }

        select.dataset.kichwasPatched = '1';

        // Create input field for fixed die value override
        const valueFieldName = `roll.dice.d${dieType.charAt(0).toUpperCase() + dieType.slice(1)}Override`;
        const input = document.createElement('input');
        input.type = 'number';
        input.name = valueFieldName;
        input.min = '1';
        input.step = '1';
        input.list = 'kichwas-die-value-list';
        input.className = `kichwas-override-value${overrideEnabled ? '' : ' kichwas-override-hidden'}`;
        input.disabled = !overrideEnabled;
        input.dataset.dieType = dieType;

        const currentFaces = getFaces(select);
        const savedOverride = app.config?.roll?.override?.[dieType] ?? '';
        input.max = String(currentFaces);
        input.placeholder = `1-${currentFaces}`;
        input.value = savedOverride ? String(savedOverride) : '';

        const updateOverride = () => {
          setOverride(
            app,
            dieType,
            getValidOverride(input, currentFaces)
          );
        };

        input.addEventListener("input", updateOverride);
        input.addEventListener("change", updateOverride);


        input.addEventListener('blur', () => {
          const currentOverride = app.config?.roll?.override?.[dieType];
          if (Number.isFinite(currentOverride)) {
            input.value = String(currentOverride);
          } else {
            input.value = '';
          }
        });

        // Ensure the select remains readable when swapped out
        select.classList.add('kichwas-override-die-select');
        select.classList.toggle('kichwas-override-hidden', overrideEnabled);
        select.disabled = overrideEnabled;

        const diceSelectContainer = select.parentElement; // .dice-select
        if (!diceSelectContainer) return;

        const chip = document.createElement('div');
        chip.className = `reaction-chip kichwas-override-chip${overrideEnabled ? ' selected' : ''}`;
        chip.dataset.dieType = dieType;
        chip.innerHTML = `
          <span><i class="${overrideEnabled ? 'fa-solid' : 'fa-regular'} fa-circle"></i></span>
        `;

        chip.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();

          app.overrideDice ??= {
            hope: false,
            fear: false
          };

          app.overrideDice[dieType] =
            !app.overrideDice[dieType];

          setOverride(
            app,
            dieType,
            app.overrideDice[dieType]
              ? getValidOverride(input, currentFaces)
              : null
          );

          app.render();
        });


        diceSelectContainer.insertBefore(chip, label);
        diceSelectContainer.insertBefore(input, select.nextSibling);
      });
    }
  });

})();

Hooks.once('init', () => {
  game.settings.register('daggerheart-kichwas-ui-refinement', 'cheatDieRolls', {
    name: 'Cheat Die Rolls',
    hint: 'Allow players to override die roll values.',
    scope: 'client',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      refreshActorSheets();
    }
  });

});