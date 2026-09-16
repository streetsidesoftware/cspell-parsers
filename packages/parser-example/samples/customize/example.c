// This config only spell checks the "comment.block.doc" tag (see cspell.config.mts:
// customizePlugin({ tags: { '*': false, 'comment.block.doc': true } })), so plain line comments like this
// one - seperate, recieve, occured - are never spell checked.

/* Block comments that aren't doc comments aren't checked either: adress, calender, acommodate. */

/**
 * Doc comments are the only thing spell checked by this config, so this paragraph has to be spelled
 * correctly for the sample to pass.
 */
int total = 0;
