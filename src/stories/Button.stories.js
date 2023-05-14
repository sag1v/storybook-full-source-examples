import { useState } from 'react';
import { Button } from './Button';
// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction
export default {
  title: 'Components/Button',
  component: Button,
};

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args

export const WithState = () => {
  const [flag, setFlag] = useState(false);
  return (
    <Button onClick={() => setFlag((o) => !o)} label={flag ? 'On' : 'Off'} />
  );
};

export const General = () => <Button label="General" />;
