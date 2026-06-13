# kichwas-daggerheart-ui-refinement
My refinements to the Daggerheart UI. Changing a few things to my preferences.

At present this does two things:

- Optional display of the Spellcast trait as a small text entry to the left of the header labels for class through ancestry.
- Makes the fear track a fixed position element at the top center of the screen. It can still be hidden or set to either icons or a progress bar, but it is smaller and locked in place.
- Made adjustments so it does not conflict with **sleek ui**, and locks the fear tracker in place when using **fear-tracker-plus**.
- Each change has a setting in the settings menu so you can pick between them.

PERMANENT TODO:
- Ensure it doesn't conflict with other popular UI mods. This TODO is permanent. As new mods come out, need to look at this each time, and then update records of what is working / not working.

Note: Hand coded, with comments in the code for what and why in case folks find bugs.

CHANGES:
- Settings to position and resize the fear tracker
- No longer need to hide the spellcast trait blocking the character art as whatever savage had coded that into Daggerheart has finally gained eyes and moved it. Preserved the ability to show the trair on the header labels, disabled by default, as the new default under the trait is better. ;)

