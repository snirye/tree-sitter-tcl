/**
 * @file parser for tcl language
 * @author Snir Yehuda <sniryehud@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// tree-sitter: https://tree-sitter.github.io/tree-sitter/creating-parsers

// we follow this man! https://www.tcl.tk/man/tcl8.6/TclCmd/Tcl.html#M10
// or `man tcl`

module.exports = grammar({
  name: 'tcl',

  extras: $ => [], 

  rules: {
      // last command can be without a terminator
      tcl_script: $ => repeat1(choice($.command, $.comment, $._terminator, $._space)),

      command: $ => seq(
          field('name', $.word),
          field('arg_list', optional($._arguments_list)),
          optional($._space),
          $._terminator
      ),

      _arguments_list: $ => repeat1(seq($._space,field('argument', $.word))),

      // avoid backslash sequence 
      _terminator: $ => choice(/\n/, ';','\0'),

      word: $ => repeat1($._word),

      _word: $ => choice(
          $.bare_word,
          $.variable_substitution,
          $.command_substitution,
          $.double_quotes,
          $.braces,
      ),

      // not start with quotes, braces, command_substitution and variable_substitution
      bare_word: $ => /[^;\s\"\{\[\$][^\s\[\$]*/,

      command_substitution: $ => seq('[', alias($.command_without_close_brackets, $.command), ']'), // prec to avoid confusion with brackets
      command_without_close_brackets: $ => seq(
          field('name', alias($.word_without_close_brackets, $.word)),
          field('arg_list', optional($._arguments_list_without_close_brackets)),
          optional($._space),
      ),

      word_without_close_brackets: $ => repeat1($._word_without_close_brackets),
      _word_without_close_brackets: $ => choice(
          alias($.bare_word_without_close_brackets, $.bare_word),
          $.variable_substitution,
          $.command_substitution,
          $.double_quotes,
          $.braces,
      ),

      _arguments_list_without_close_brackets: $ => repeat1(seq($._space,field('argument', alias($.word_without_close_brackets, $.word)))),

      bare_word_without_close_brackets: $ => /[^\s\]\"\{\[\$][^\s\]\[\$]*/,

      // Command substitution, variable substitution, and backslash substitution 
      double_quotes: $ => seq('"', optional($.double_quotes_internal), '"'),
      double_quotes_internal: $ => repeat1(choice(/[^\[\$\\\"]+/, $.command_substitution, $.variable_substitution, $._backslash_substitution)),

      // added prec so we dont confuse with braces
      argument_expansion: $ => prec(0, /\{\*\}[^\s]/),


      // I used prec since we first check its not argument_expansion
      braces: $ => prec(1, seq('{', optional($.braces_internal), '}')),
      // we dont care about the internals of the braces. just make sure they even
      // braces can be just text or a proc implementation. since we cant know how its being used
      // in case we want to parse the internal of braces, we can simply pass the content of it to the parses. 
      //
    
      
      braces_internal: $ => repeat1(choice(/[^\{\}]+/, $.even_braces)),
      even_braces: $ => prec(1, seq('{', optional($.braces_internal), '}')),


      variable_substitution: $ => seq('$',
          choice(
              $.alowed_variable_name,
              $.braces,
              seq($.alowed_variable_name, token.immediate('('), $.word, token.immediate(')'))
          )),
      alowed_variable_name: $ => /[a-zA-Z0-9_]+/,


      _backslash_substitution: $ => seq('\\', choice(/./, /\n/)),

      _single_space: $ => / /,
      _single_tab: $ => /\t/,
      _space: $ => prec.right(repeat1(choice($._single_space, $._single_tab))),

      comment: $ => /#[^\n]*/, // TODO: add support for inline comments
  }
});
