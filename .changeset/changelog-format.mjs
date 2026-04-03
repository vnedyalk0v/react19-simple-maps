function normalizeLine(line) {
  return line.trim().replace(/^[-*]\s+/, '');
}

function formatSummary(summary) {
  const lines = summary
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, allLines) => {
      if (line.trim() !== '') return true;
      const previous = allLines[index - 1];
      const next = allLines[index + 1];
      return Boolean(previous && next);
    });

  if (lines.length === 0) return '';

  const [firstLine, ...rest] = lines;
  let output = `- ${normalizeLine(firstLine)}`;

  if (rest.length > 0) {
    const formattedRest = rest
      .filter((line) => line.trim() !== '')
      .map((line) => `  ${line.trim()}`)
      .join('\n');

    if (formattedRest) {
      output += `\n${formattedRest}`;
    }
  }

  return output;
}

export async function getReleaseLine(changeset) {
  return formatSummary(changeset.summary);
}

export async function getDependencyReleaseLine(
  _changesets,
  dependenciesUpdated,
) {
  if (dependenciesUpdated.length === 0) return '';

  const dependencyLines = dependenciesUpdated.map(
    (dependency) => `  - ${dependency.name}@${dependency.newVersion}`,
  );

  return ['- Updated dependencies', ...dependencyLines].join('\n');
}

export default {
  getReleaseLine,
  getDependencyReleaseLine,
};
