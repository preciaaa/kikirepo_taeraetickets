function parseTicketText(text) {
    console.log('Parsing text:', text);
    const fields = {
        event_name: '',
        venue: '',
        date: '',
        category: '',
        price: '',
        section: '',
        row: '',
        seat: '',
        name: '',
        door_open_time: ''
    };
    // Normalize text for easier matching
    const normText = text.replace(/\r/g, '').replace(/\u00a0/g, ' ');
    let lines = normText.split('\n').map(l => l.trim()).filter(l => l);
    // Remove decorative and repeated lines
    const ignorePatterns = [
        /^\*+ ?THIS IS YOUR TICKET ?\*+$/i,
        /^\*+$/,
        /^ticketmaster$/i,
        /^stay connected with us/i,
        /^conditions of sale$/i,
        /^terms & conditions/i,
        /^\d{12,}$/,
        /^\d{4,}$/
    ];
    lines = lines.filter(line => !ignorePatterns.some(pat => pat.test(line)));

    // --- Markdown Table Parsing ---
    // Find all lines that look like table rows
    const tableRows = lines.filter(line => line.startsWith('|') && line.endsWith('|'));
    if (tableRows.length > 0) {
        tableRows.forEach(row => {
            // Split by | and trim
            const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
            if (cells.length >= 2) {
                // Map left cell to field, right cell to value
                const label = cells[0].toLowerCase();
                const value = cells.slice(1).join(' ').replace(/\s+/g, ' ').trim();
                if (label.includes('name')) fields.name = value;
                else if (label.includes('category')) fields.category = value;
                else if (label.includes('ticket price')) fields.price = value.replace(/[^\d.]/g, '');
                else if (label.includes('section')) fields.section = value;
                // Handle row/seat in one row or split across label/value
                else if (label.match(/^row\s*[:.]?\s*([A-Z0-9]+)$/i) && value.match(/^seat\s*[:.]?\s*([A-Z0-9]+)$/i)) {
                    // Table row is split: label is 'Row : A', value is 'Seat : 15'
                    const rowMatch = label.match(/^row\s*[:.]?\s*([A-Z0-9]+)$/i);
                    const seatMatch = value.match(/^seat\s*[:.]?\s*([A-Z0-9]+)$/i);
                    if (rowMatch) fields.row = rowMatch[1];
                    if (seatMatch) fields.seat = seatMatch[1];
                } else if (label.includes('row')) {
                    // Fallback: old logic
                    const seatMatch = value.match(/seat\s*:? 0([^|\n]+?)(?=\s*\||\s*Seat|$)/i);
                    const rowMatch = value.match(/[A-Z0-9]+/i);
                    if (rowMatch) fields.row = rowMatch[0];
                    if (seatMatch) fields.seat = seatMatch[1];
                }
            }
        });
    }

    // Fallback: label-based extraction for non-table tickets or missing fields
    function extractByLabel(label, lines, pattern = /[:.\s]+(.+)/i) {
        for (const line of lines) {
            const regex = new RegExp(label + pattern.source, 'i');
            const match = line.match(regex);
            if (match) return match[1].trim();
        }
        return '';
    }
    if (!fields.category) fields.category = extractByLabel('Category', lines);
    if (!fields.price) {
        let price = extractByLabel('Ticket ?Price', lines, /[:.\s]+\$?([\d,.]+)/i);
        if (!price) {
            const priceMatch = normText.match(/\$([\d,.]+)/);
            if (priceMatch) price = priceMatch[1];
        }
        fields.price = price;
    }
    if (!fields.section) fields.section = extractByLabel('Section', lines);
    if (!fields.row) fields.row = extractByLabel('Row', lines);
    if (!fields.seat) fields.seat = extractByLabel('Seat', lines);
    if (!fields.name) fields.name = extractByLabel('Name', lines);
    // Event name: first all-caps line that is not a known header/footer/venue/category
    const knownNonEvent = [
        'NAME', 'ORDER', 'TICKET', 'CATEGORY', 'PRICE', 'DOOR', 'SECTION', 'ROW', 'SEAT', 'QUEUE', 'ENTRANCE',
        'DOORS OPEN', 'NO ADMISSION', 'NO PHOTOGRAPHY', 'CONDITIONS', 'TERMS', 'BARCODE', 'QR', 'CODE',
        'STAY CONNECTED', 'SINGAPORE SPORTS HUB', 'OCBC', 'CAPITOL THEATRE', 'GATEWAY THEATRE',
        'SINGAPORE EXPO', 'INDOOR STADIUM', 'TICKETMASTER', 'THIS IS YOUR TICKET'
    ];
    if (!fields.event_name) {
        for (const line of lines) {
            if (
                line === line.toUpperCase() &&
                !knownNonEvent.some(word => line.includes(word)) &&
                !/^[\d\s]+$/.test(line) &&
                line.length > 3 &&
                !fields.venue || (fields.venue && !line.includes(fields.venue.toUpperCase()))
            ) {
                fields.event_name = line;
                break;
            }
        }
    }
    // Venue: look for known venues
    const venueMatch = normText.match(/(SINGAPORE EXPO HALL \d+|GATEWAY THEATRE|SINGAPORE INDOOR STADIUM|CAPITOL THEATRE)/i);
    if (venueMatch) fields.venue = venueMatch[1].trim();
    // Date: look for lines with day, date, time
    const dateMatch = normText.match(/((MON|TUE|WED|THU|FRI|SAT|SUN) ?\d{1,2} ?[A-Z]{3,9} ?\d{4},? ?\d{1,2}:\d{2}(AM|PM)?)/i);
    if (dateMatch) fields.date = dateMatch[1].replace(/ +/g, ' ').replace(' ,', ',').trim();
    // Fallback for event name: first non-label, non-empty, non-all-numeric line
    if (!fields.event_name) {
        for (const line of lines) {
            if (
                line &&
                !knownNonEvent.some(word => line.includes(word)) &&
                !/^[\d\s]+$/.test(line)
            ) {
                fields.event_name = line;
                break;
            }
        }
    }
    // --- FINAL: Always extract row/seat from 'Row : X    Seat : Y' if present ---
    for (const line of lines) {
        const match = line.match(/Row\s*[:.]?\s*([^\s|]+)\s+Seat\s*[:.]?\s*([^\s|]+)/i);
        if (match) {
            fields.row = match[1];
            fields.seat = match[2];
            break;
        }
    }
    // Remove sanitization for row to preserve original extracted value
    // if (fields.row) {
    //     const rowVal = fields.row.match(/[A-Z0-9]+/i);
    //     if (rowVal) fields.row = rowVal[0];
    // }
    // 1. section (allow multi-word, table or label)
    let section = '';
    if (fields.section) section = fields.section;
    else section = extractByLabel('Section', lines);
    if (!section) {
        // Fallback: regex for 'Section: ...' or 'Section ...'
        const secMatch = lines.join('\n').match(/Section\s*[:.\s]+([A-Z0-9 \-]+)(?=\n|$)/i);
        if (secMatch) section = secMatch[1].trim();
    }
    fields.section = section || null;
    // 2. row (extract only after 'Row:' and before next pipe or 'Seat')
    let row = '';
    if (fields.row) row = fields.row;
    else row = extractByLabel('Row', lines);
    if (row) {
        // If row is like 'Row : A | Seat : 15', extract 'A'
        const rowMatch = row.match(/Row\s*:? 0([^|\n]+?)(?=\s*\||\s*Seat|$)/i);
        if (rowMatch) {
            let rowVal = rowMatch[1].trim();
            if (rowVal !== 'Seat') {
                row = rowVal;
            } else {
                const fallbackRow = row.match(/[A-Z0-9]+/i);
                if (fallbackRow) row = fallbackRow[0];
            }
        } else {
            const fallbackRow = row.match(/[A-Z0-9]+/i);
            if (fallbackRow) row = fallbackRow[0];
        }
    } else {
        row = null;
    }
    // Only assign to fields.row if row is not null or undefined
    if (row !== null && row !== undefined) {
        fields.row = row.toUpperCase();
    }

    // 3. date (flexible regex, fallback to original string)
    let date = fields.date || '';
    if (!date) {
        // Look for lines with day, date, time
        const dateLine = lines.find(l => l.match(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b.*\d{1,2}:\d{2}/i));
        if (dateLine) date = dateLine.trim();
    }
    // Try to parse to YYYY-MM-DD, else fallback
    let formattedDate = null;
    if (date) {
        const dateMatch = date.match(/(\w{3,}) (\d{1,2}) (\w{3,}) (\d{4}),? (\d{1,2}:\d{2})(AM|PM)/i);
        if (dateMatch) {
            const [_, day, dayNum, month, year, time, ampm] = dateMatch;
            const months = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
            const monthIdx = months[month.toUpperCase()];
            let [hour, minute] = time.split(':').map(Number);
            if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
            if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
            const jsDate = new Date(Number(year), monthIdx, Number(dayNum), hour, minute);
            if (!isNaN(jsDate.getTime())) {
                // Format as YYYY-MM-DD
                const yyyy = jsDate.getFullYear();
                const mm = String(jsDate.getMonth() + 1).padStart(2, '0');
                const dd = String(jsDate.getDate()).padStart(2, '0');
                formattedDate = `${yyyy}-${mm}-${dd}`;
            }
        }
    }
    fields.date = formattedDate || null;
    // 4. price (look for 'Ticket Price', 'Price', or any $ followed by numbers)
    let price = fields.price || '';
    if (!price) price = extractByLabel('Ticket Price', lines, /[:.\s]+\$?([\d,.]+)/i);
    if (!price) {
        const priceMatch = lines.join('\n').match(/\$([\d,.]+)/);
        if (priceMatch) price = priceMatch[1];
    }
    fields.price = price || null;
    // 5. category (label, table, fallback null)
    let category = fields.category || '';
    if (!category) category = extractByLabel('Category', lines);
    fields.category = category || null;
    if (fields.category) {
        fields.category = fields.category.replace(/^[:.\\s]+/, '');
    }
    if (fields.section) {
        fields.section = fields.section.replace(/^[:.\\s]+/, '');
    }
    console.log('Final extracted fields:', fields);
    return fields;
}
module.exports = { parseTicketText };
