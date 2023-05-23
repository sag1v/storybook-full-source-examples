import { useState } from 'react';
import MyButton from './MyButton';
// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction
export default {
  title: 'Components/MyButton',
  component: MyButton,
};

// More on writing stories with args: https://storybook.js.org/docs/react/writing-stories/args

export const WithState = () => {
  const [flag, setFlag] = useState(false);
  return (
    <MyButton onClick={() => setFlag((o) => !o)} label={flag ? 'On' : 'Off'} />
  );
};

export const General = () => <MyButton label="General" />;
