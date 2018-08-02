import React from 'react';
import PropTypes from 'prop-types';
import Base from './Base';

const Html = ({ children, ...props }) => (
	<Base
		dangerouslySetInnerHTML={{
			__html: children,
		}}
		{...props}
	/>
);

Html.propTypes = {
	children: PropTypes.string,
	is: PropTypes.oneOfType([PropTypes.string, PropTypes.element]),
};

Html.defaultProps = {
	is: 'div',
};

/** @component */
export default Html;