
var normalchars = {'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ؤ': 'و', 'ة': 'ه', 'ي': 'ی', 'ك': 'ک'};
var normalize = function(str) {
	return String(str).replace(/[أإآؤةيك]/g, function(c) { return normalchars[c]; });
};

// aya search
var searchResult = function(resultText, resultTokens, queryTokens) {
	words = resultText.split(' ');

	// match query and result
	matched = [];
	for (q in queryTokens)
		for (r in resultTokens)
			if (resultTokens[r] == queryTokens[q] || (resultTokens[r].substr(0, queryTokens[q].length) == queryTokens[q])) {
				matched.push(Number(r));
				break;
			}

	// select surrounding words
	selection = []; queue = matched.slice(); chars = 0;
	while(chars < searchResultChars && queue.length) {
		word = queue.shift();
		if (selection.indexOf(word) >= 0)
			continue;

		if (word > 0)
			queue.push(word-1);
		if (word < words.length-1)
			queue.push(word+1);
		selection.push(word);
		chars += words[word].length;
	}

	// bold matched words
	for (m in matched)
		words[matched[m]] = '<b>'+ words[matched[m]] +'</b>';

	// result composition
	result = [];
	selection.sort(function(a, b) { return a - b; });

	var lastW = -1;
	selection.forEach(function(w) {
		if (w != lastW+1)
			result.push('...');
		result.push(words[w]);
		lastW = w;
	});

	if (lastW != selection.length-1)
		result.push('...');

	return result.join(' ');
}
