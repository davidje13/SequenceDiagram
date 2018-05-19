export function hasDroppedFile(event, mime) {
	if(!event.dataTransfer.items && event.dataTransfer.files.length === 0) {
		// Work around Safari not supporting dataTransfer.items
		return [...event.dataTransfer.types].includes('Files');
	}

	const items = (event.dataTransfer.items || event.dataTransfer.files);
	return (items.length === 1 && items[0].type === mime);
}

export function getDroppedFile(event, mime) {
	const items = (event.dataTransfer.items || event.dataTransfer.files);
	if(items.length !== 1 || items[0].type !== mime) {
		return null;
	}
	const [item] = items;
	if(item.getAsFile) {
		return item.getAsFile();
	} else {
		return item;
	}
}

export function getFileContent(file) {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.addEventListener('loadend', () => {
			resolve(reader.result);
		}, {once: true});
		reader.readAsText(file);
	});
}
