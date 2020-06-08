const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const prettier = require('prettier');
const os = require('os');
const argv = require('yargs').argv;

function getFilesFolders(dir, isRecursive = true, type = 'file') {
  return fs
    .readdirSync(dir)
    .filter((file) => !file.includes('node_modules'))
    .reduce((files, file) => {
      const name = path.join(dir, file);
      const isDirectory = fs.statSync(name).isDirectory();
      let fileFolder = [];
      switch (type) {
        case 'file':
          fileFolder = isDirectory ? [] : [name];
          break;
        case 'folder':
          fileFolder = isDirectory ? [name] : [];
          break;
        default:
          fileFolder = [name];
          break;
      }
      const fileFolders = isRecursive && isDirectory ? getFilesFolders(name, isRecursive, type) : [];
      return [...files, ...fileFolder, ...fileFolders];
    }, []);
}

function getInsomniaJson({ resources }) {
  return {
    _type: 'export',
    __export_format: 4,
    resources: resources.sort((a, b) => (a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1)),
  };
}

function getGraphQlVariables(graphQlString) {
  const firstLine = graphQlString.split(os.EOL)[0];
  if (firstLine.includes('(')) {
    return graphQlString
      .match(/\(([^)]+)\)/)[1]
      .split('$')
      .filter((_, index) => index !== 0)
      .map((x) => x.trim().split(':')[0])
      .reduce((acc, value) => {
        return {
          ...acc,
          [value]: '',
        };
      }, {});
  } else {
    return {};
  }
}

function getInsomniaJsonResource({ name, text, url }) {
  return {
    _id: `reg_${uuidv4().replace(/-/g, '')}`,
    body: {
      mimeType: 'application/graphql',
      text: `{\"query\":\"${text.replace(/\n/g, '\\n')}\",\"variables\":${JSON.stringify(getGraphQlVariables(text))}}`,
    },
    isPrivate: false,
    method: 'POST',
    name,
    url,
    _type: 'request',
  };
}

function parseGqlStatements(filePath, filePathDelimiter, url) {
  const fileContents = fs.readFileSync(filePath).toString();
  const gqlLines = fileContents.split('gql`');
  return gqlLines
    .map((lines, index) => {
      if (index === 0) {
        return null;
      } else {
        const firstLine = lines.split('`')[0].trim();
        const nameLine = gqlLines[index - 1].split(os.EOL).pop();
        if (firstLine.startsWith('//') || nameLine.includes('?') || nameLine.trim() === '') {
          console.log(`Error: gql statements comment out or within ternary statements in ${filePath} not supported.`);
          return null;
        } else {
          try {
            const splitFileNames = path.resolve(filePath).split(`${filePathDelimiter}/`);
            const methodName = gqlLines[index - 1].split(os.EOL).pop().split(' = ').shift().split(' ').pop();
            const name = `${methodName} (${splitFileNames[splitFileNames.length - 1]})`;
            const text = prettifyGraphQl(firstLine);
            return { name, text, url };
          } catch (error) {
            console.log(`Error in ${filePath}`, error);
            return null;
          }
        }
      }
    })
    .filter((x) => x !== null);
}

function prettifyGraphQl(graphQlString) {
  return prettier.format(graphQlString, {
    parser: 'graphql',
  });
}

function parseGraphQlByDirectory(directory, url) {
  const filePathDelimiter = path.resolve(directory).split(path.sep).pop();

  const fileSaveName = 'insomnia-import.json';
  const graphQlUrl = url;
  const fileExtensions = ['.jsx', '.js'];

  const files = getFilesFolders(directory).filter((file) => fileExtensions.includes(path.extname(file)));
  const resources = files.reduce((acc, file) => {
    const gqlStatements = parseGqlStatements(file, filePathDelimiter, graphQlUrl);
    return [...acc, ...gqlStatements.map(getInsomniaJsonResource)];
  }, []);
  const insomniaJson = getInsomniaJson({ resources });
  fs.writeFileSync(fileSaveName, JSON.stringify(insomniaJson, null, 2));
  console.log(`Created ${resources.length} resources for import into ${fileSaveName}!`);
}

parseGraphQlByDirectory(argv.directory, argv.url);
