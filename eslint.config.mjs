import common from 'eslint-config-mahir/common';
import edge from 'eslint-config-mahir/edge';
import module from 'eslint-config-mahir/module';
import node from 'eslint-config-mahir/node';
import react from 'eslint-config-mahir/react';
import typescript from 'eslint-config-mahir/typescript';

/**
 * @type {import('@typescript-eslint/utils').TSESLint.FlatConfig.ConfigArray}
 */
export default [
	...common,
	...node,
	...typescript,
	...module,
	...react,
	...edge,
	{
		rules: {
			'id-length': 'off',
			'no-alert': 'off',
			// Browsers needs some checks that ts says always exists
			'@typescript-eslint/no-unnecessary-condition': 'off',
		},
	},
	{
		ignores: ['.github', '.yarn', 'build', '.plasmo'],
	},
];
