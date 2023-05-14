import React, { useState, useMemo } from 'react';
import { Story, Source, useOf } from '@storybook/blocks';
import { getStoryImports } from './utils';

import './ComponentPreview.css';

const useStorySourceCode = ({ of }) => {
  const resolvedStory = useOf(of);
  const actualStory = resolvedStory.story;
  const storyFuncName = actualStory.name.replaceAll(' ', '');
  const storyCode = `const ${storyFuncName} = ${actualStory.parameters.docs.source.originalSource}`;
  const storiesFileSourceCode = actualStory.parameters.storySource.source;
  const storyImports = useMemo(
    () => getStoryImports(storiesFileSourceCode, storyCode).trim(),
    [storiesFileSourceCode, storyCode]
  );

  const codeChunks = [storyImports, '\n', storyCode];
  const code = codeChunks.join('\n');
  return code;
};

const StoryCode = ({ of }) => {
  const storyCode = useStorySourceCode({ of });
  return <Source code={storyCode} language="jsx" dark />;
};

export const ComponentPreview = ({ of, height }) => {
  const [showCode, setShowCode] = useState(false);
  const resolvedStory = useOf(of);

  return (
    <div className="rootContainer">
      <div className="content">
        <div className="storySection">
          <div className="story">
            <Story of={of} height={height} inline />
          </div>
        </div>
        <div className="actions">
          <button className="button" onClick={() => setShowCode((o) => !o)}>
            Show code
          </button>
        </div>
      </div>

      <div className={`codeContainer ${showCode ? 'showCode' : ''}`}>
        <StoryCode of={of} />
      </div>
    </div>
  );
};
