const config = {
  staticDirs: ['../public'],
  stories: ['../src/**/*MyButton*.(mdx|stories.js)'],
  framework: {
    name: '@storybook/react-webpack5',
    options: {},
  },
  // docs: {
  //   autodocs: false,
  // },
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    // '@storybook/preset-create-react-app',
    // '@storybook/addon-interactions',
    // {
    //   name: '@storybook/addon-storysource',
    //   options: {
    //     loaderOptions: {
    //       injectStoryParameters: false,
    //     },
    //   },
    // },
  ],
};
export default config;
