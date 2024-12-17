# Contributing to bun-plugin-html

Thank you for your interest in contributing to `bun-plugin-html`! We welcome all contributions, whether they're bug fixes, new features, documentation improvements, or general feedback.

To get started contributing to `bun-plugin-html`, please follow the guidelines below.

## Getting started

### Prerequisites
Ensure that you have the following installed
* [Git](https://git-scm.com/)
* [Bun](https://bun.sh/) (version 1.1.34 or later)

### Setup
1. Fork the repository
2. Clone your fork to your machine
3. Install dependencies with `bun install`
4. Install the [`Biome`](https://biomejs.dev/guides/integrate-in-editor/) LSP for your editor

### Developing
You're now ready to start developing! Just make your desired changes to the repository, and run the code by writing a new or running an existing test, to try out your changes!

> [!CAUTION]
> Some tests may fail automatically for you, if you do not have the latest version of bun installed before hand, or if the tests have not been updated to work with the latest version of Bun!
> If this happens upgrade bun with `bun upgrade`, and if the issue persists, attempt overwriting the `test/expected` directory with the `test/generation` directory.

Ensure that if you're adding another feature to always add a new test.

After you are finished with all of your changes, and you wish to make a pull request, first ensure all tests are passing when running `bun run test`, then run `bun run lint` to see if there are any linting issues. You can automatically fix some of the issues with `bun run lint:fix`.

That's it! Just create a pull request with your changes, and we'll try to review it quickly!

## Reporting Issues
If you encounter a bug or have a suggestion, please [create an issue](https://github.com/BjornTheProgrammer/bun-plugin-html/issues/new). Provide as much detail as possible, including:

* Steps to reproduce the issue.
* Expected behavior vs. actual behavior.
* Any relevant error messages or logs.

When suggesting enhancements, describe the use case and how it would benefit users

## License
By contributing to `bun-plugin-html`, you agree that your contributions will be licensed under the same MIT License as the project unless explicitly stated otherwise.

Thank you for helping improve the Bun Plugin for HTML! 🎉
