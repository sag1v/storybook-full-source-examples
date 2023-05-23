import React from 'react';
import PropTypes from 'prop-types';

console.log('React version - ', React.version);

const MyButton = ({ label }) => <div>{label}</div>;

MyButton.propTypes = {
  /**
   * this is a prop
   */
  label: PropTypes.string,
};

export default MyButton;
