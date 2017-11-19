defineDescribe('Block', [
	'./Block',
	'./BaseComponent',
], (
	Block,
	BaseComponent
) => {
	'use strict';

	it('registers itself with the component store', () => {
		const components = BaseComponent.getComponents();
		expect(components.get('block begin')).toEqual(
			jasmine.any(Block.BlockBegin)
		);
		expect(components.get('block split')).toEqual(
			jasmine.any(Block.BlockSplit)
		);
		expect(components.get('block end')).toEqual(
			jasmine.any(Block.BlockEnd)
		);
	});
});
