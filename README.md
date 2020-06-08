# graphql-file-parser

Recursively searches a directory for `.js` and `.jsx` files, finds Apollo [gql](https://www.apollographql.com/docs/apollo-server/api/apollo-server/#gql) template literal tags, and creates an [Insomnia](https://insomnia.rest/) import file.

## Requirements

[Node.js](https://nodejs.org/en/download/) (version >= 10)

## Installation

`npm i`

## Configuration

Open package.json and tweak the `directory` and `url` parameters in the start script.

## Run

Run `npm start` and insomnia-import.json file will be generated. You can import this into Insomnia.
