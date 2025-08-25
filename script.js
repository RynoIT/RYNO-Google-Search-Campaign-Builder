
    document.addEventListener('DOMContentLoaded', function() {
        // --- DOM Elements ---
        const campaignsContainer = document.getElementById('campaigns-container');
        const multiCampaignForm = document.getElementById('multi-campaign-form');
        const saveBtn = document.getElementById('save-build');
        const loadInput = document.getElementById('load-build-input');
        const addCampaignBtn = document.getElementById('add-campaign');

        const templates = {
            campaign: document.getElementById('campaign-template'),
            adGroup: document.getElementById('ad-group-template'),
            call: document.getElementById('call-ext-template'),
            sitelink: document.getElementById('sitelink-ext-template'),
            callout: document.getElementById('callout-ext-template'),
            snippet: document.getElementById('snippet-ext-template'),
            promotion: document.getElementById('promotion-ext-template')
        };
        
        // --- Helper Functions ---
        const getInputValue = (element, selector) => element.querySelector(selector)?.value || '';
        const setInputValue = (element, selector, value) => { if(element.querySelector(selector)) element.querySelector(selector).value = value; };
        const getInputChecked = (element, selector) => element.querySelector(selector)?.checked || false;
        const setInputChecked = (element, selector, checked) => { if(element.querySelector(selector)) element.querySelector(selector).checked = checked; };
        const splitTextarea = (value) => value.trim().split('\n').filter(line => line.trim() !== '');
        
        const parseKeyword = (keywordLine) => {
            let keyword = keywordLine.trim();
            let matchType = 'Broad';
            if (keyword.startsWith('[') && keyword.endsWith(']')) {
                matchType = 'Exact';
                keyword = keyword.slice(1, -1).trim();
            } else if (keyword.startsWith('"') && keyword.endsWith('"')) {
                matchType = 'Phrase';
                keyword = keyword.slice(1, -1).trim();
            }
            return { keyword, matchType };
        };
        
        const escapeCsvField = (field) => {
            const str = String(field || '');
            // Only quote if the string contains a comma, a double quote, or a newline
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const createCsvRow = (data, headers) => {
            return headers.map(header => escapeCsvField(data[header])).join(',');
        };

        // --- Core Functions ---
        const addExtension = (container, type, data = null) => {
            const clone = templates[type].content.cloneNode(true);
            const extElement = clone.querySelector('.extension-item');
            container.appendChild(clone);
            if (data) loadExtensionData(extElement, type, data);
            return extElement;
        };

        const addAdGroup = (adGroupsContainer, data = null) => {
            const clone = templates.adGroup.content.cloneNode(true);
            const adGroupItem = clone.querySelector('.ad-group-item');
            adGroupsContainer.appendChild(adGroupItem);
            if (data) loadSingleAdGroupData(adGroupItem, data);
            return adGroupItem;
        };

        const addCampaign = (data = null) => {
            const clone = templates.campaign.content.cloneNode(true);
            const campaignItem = clone.querySelector('.campaign-item');
            campaignsContainer.appendChild(campaignItem);
            
            if (data) {
                loadSingleCampaignData(campaignItem, data);
            } else {
                addAdGroup(campaignItem.querySelector('.ad-groups-container')); // Add one default ad group
            }
            return campaignItem;
        };

        // --- Data Extraction (get... functions) ---
        const getSingleAdGroupData = (adGroupEl) => ({
            name: getInputValue(adGroupEl, '.ad-group-name'),
            keywords: getInputValue(adGroupEl, '.keywords'),
            finalUrl: getInputValue(adGroupEl, '.final-url'),
            adgroupNegatives: getInputValue(adGroupEl, '.adgroup-negatives'),
            headlines: getInputValue(adGroupEl, '.rsa-headlines'),
            descriptions: getInputValue(adGroupEl, '.rsa-descriptions'),
            sitelinks: Array.from(adGroupEl.querySelectorAll('.sitelinks-container .extension-item')).map(el => ({
                text: getInputValue(el, '.sitelink-text'), url: getInputValue(el, '.sitelink-url'),
                desc1: getInputValue(el, '.sitelink-desc1'), desc2: getInputValue(el, '.sitelink-desc2')
            }))
        });

        const getSingleCampaignData = (campaignEl) => ({
            settings: {
                name: getInputValue(campaignEl, '.campaign-name'), budget: getInputValue(campaignEl, '.campaign-budget'),
                status: getInputValue(campaignEl, '.campaign-status'), bidStrategy: getInputValue(campaignEl, '.bid-strategy'),
                adSchedule: getInputValue(campaignEl, '.ad-schedule'), campaignNegatives: getInputValue(campaignEl, '.campaign-negatives'),
                searchPartners: getInputChecked(campaignEl, '.search-partners'), displayNetwork: getInputChecked(campaignEl, '.display-network'),
                locationOption: getInputValue(campaignEl, '.location-option'),
            },
            locations: getInputValue(campaignEl, '.locations'),
            adGroups: Array.from(campaignEl.querySelectorAll('.ad-group-item')).map(getSingleAdGroupData),
            extensions: {
                call: Array.from(campaignEl.querySelectorAll('.call-extension-container .extension-item')).map(el => ({ phone: getInputValue(el, '.call-phone-number'), country: getInputValue(el, '.call-country') })),
                callouts: Array.from(campaignEl.querySelectorAll('.callouts-container .extension-item')).map(el => ({ text: getInputValue(el, '.callout-text') })),
                snippets: Array.from(campaignEl.querySelectorAll('.snippets-container .extension-item')).map(el => {
                    const values = Array.from(el.querySelectorAll('.snippet-value')).map(input => input.value.trim()).filter(v => v);
                    return { header: getInputValue(el, '.snippet-header'), values: values.join('\n') };
                }),
                promotions: Array.from(campaignEl.querySelectorAll('.promotions-container .extension-item')).map(el => ({ item: getInputValue(el, '.promo-item'), url: getInputValue(el, '.promo-url'), type: getInputValue(el, '.promo-type'), value: getInputValue(el, '.promo-value'), occasion: getInputValue(el, '.promo-occasion') }))
            }
        });
        
        // --- Data Loading (load... functions) ---
        const loadExtensionData = (el, type, data) => {
            switch(type) {
                case 'call': setInputValue(el, '.call-phone-number', data.phone); setInputValue(el, '.call-country', data.country); break;
                case 'sitelink': setInputValue(el, '.sitelink-text', data.text); setInputValue(el, '.sitelink-url', data.url); setInputValue(el, '.sitelink-desc1', data.desc1); setInputValue(el, '.sitelink-desc2', data.desc2); break;
                case 'callout': setInputValue(el, '.callout-text', data.text); break;
                case 'snippet':
                    setInputValue(el, '.snippet-header', data.header);
                    const values = data.values.split('\n').map(v => v.trim());
                    const valueInputs = el.querySelectorAll('.snippet-value');
                    valueInputs.forEach((input, index) => {
                        if (values[index]) {
                            input.value = values[index];
                        }
                    });
                    break;
                case 'promotion': setInputValue(el, '.promo-item', data.item); setInputValue(el, '.promo-url', data.url); setInputValue(el, '.promo-type', data.type); setInputValue(el, '.promo-value', data.value); setInputValue(el, '.promo-occasion', data.occasion); break;
            }
        };

        const loadSingleAdGroupData = (adGroupEl, adGroupData) => {
            setInputValue(adGroupEl, '.ad-group-name', adGroupData.name);
            setInputValue(adGroupEl, '.keywords', adGroupData.keywords);
            setInputValue(adGroupEl, '.final-url', adGroupData.finalUrl);
            setInputValue(adGroupEl, '.adgroup-negatives', adGroupData.adgroupNegatives);
            setInputValue(adGroupEl, '.rsa-headlines', adGroupData.headlines);
            setInputValue(adGroupEl, '.rsa-descriptions', adGroupData.descriptions);
            const sitelinksContainer = adGroupEl.querySelector('.sitelinks-container');
            adGroupData.sitelinks?.forEach(data => addExtension(sitelinksContainer, 'sitelink', data));
        };

        const loadSingleCampaignData = (campaignEl, campaignData) => {
            const { settings, locations, adGroups, extensions } = campaignData;
            setInputValue(campaignEl, '.campaign-name', settings.name);
            setInputValue(campaignEl, '.campaign-budget', settings.budget);
            setInputValue(campaignEl, '.campaign-status', settings.status);
            setInputValue(campaignEl, '.bid-strategy', settings.bidStrategy);
            setInputValue(campaignEl, '.ad-schedule', settings.adSchedule);
            setInputValue(campaignEl, '.campaign-negatives', settings.campaignNegatives);
            setInputChecked(campaignEl, '.search-partners', settings.searchPartners);
            setInputChecked(campaignEl, '.display-network', settings.displayNetwork);
            setInputValue(campaignEl, '.location-option', settings.locationOption || 'Presence');
            setInputValue(campaignEl, '.locations', locations || '');
            
            const adGroupsContainer = campaignEl.querySelector('.ad-groups-container');
            adGroupsContainer.innerHTML = '';
            adGroups?.forEach(data => addAdGroup(adGroupsContainer, data));
            
            extensions?.call?.forEach(data => addExtension(campaignEl.querySelector('.call-extension-container'), 'call', data));
            extensions?.callouts?.forEach(data => addExtension(campaignEl.querySelector('.callouts-container'), 'callout', data));
            extensions?.snippets?.forEach(data => addExtension(campaignEl.querySelector('.snippets-container'), 'snippet', data));
            extensions?.promotions?.forEach(data => addExtension(campaignEl.querySelector('.promotions-container'), 'promotion', data));
        };
        
        // --- Event Delegation ---
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            const campaignItem = target.closest('.campaign-item');
            const adGroupItem = target.closest('.ad-group-item');

            // Campaign actions
            if (target.closest('.remove-campaign')) {
                if (campaignsContainer.children.length > 1) campaignItem.remove();
                else alert("You must have at least one campaign.");
            }
            if (target.closest('.duplicate-campaign')) {
                const newCampaign = addCampaign(getSingleCampaignData(campaignItem));
                newCampaign.querySelector('.campaign-name').value += " (Copy)";
            }
            if (target.closest('.campaign-header')) {
                campaignItem.querySelectorAll('.campaign-content').forEach(el => el.classList.toggle('hidden'));
            }
            if (target.closest('.add-ad-group')) {
                addAdGroup(campaignItem.querySelector('.ad-groups-container'));
            }
            if (target.closest('.add-ext')) {
                const btn = target.closest('.add-ext');
                const container = target.closest('.campaign-item, .ad-group-item').querySelector(btn.dataset.extContainer);
                const limit = parseInt(btn.dataset.limit, 10);
                if (!limit || container.children.length < limit) {
                    addExtension(container, btn.dataset.extType);
                } else {
                    alert(`Only ${limit} of this extension type is allowed.`);
                }
            }

            // Ad Group actions
            if (target.closest('.remove-ad-group')) {
                const container = adGroupItem.parentElement;
                if (container.children.length > 1) adGroupItem.remove();
                else alert("You must have at least one ad group.");
            }
            if (target.closest('.duplicate-ad-group')) {
                const container = adGroupItem.parentElement;
                const newAdGroup = addAdGroup(container, getSingleAdGroupData(adGroupItem));
                newAdGroup.querySelector('.ad-group-name').value += " (Copy)";
            }
            if (target.closest('.remove-ext')) {
                target.closest('.extension-item').remove();
            }
        });
        
        document.body.addEventListener('input', (e) => {
            if (e.target.matches('.rsa-scratchpad')) {
                const counter = e.target.parentElement.querySelector('.scratchpad-counter');
                if (counter) counter.textContent = `(${e.target.value.length} chars)`;
            }
        });
        
        // --- Save / Load Build ---
        saveBtn.addEventListener('click', () => {
            const data = {
                clientName: document.getElementById('client-name').value,
                clientCid: document.getElementById('client-cid').value,
                trackingTemplate: document.getElementById('tracking-template').value,
                urlSuffix: document.getElementById('url-suffix').value,
                campaigns: Array.from(document.querySelectorAll('.campaign-item')).map(getSingleCampaignData)
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const clientName = data.clientName.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'campaign_build';
            link.download = `${clientName}.json`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        });

        loadInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    campaignsContainer.innerHTML = '';
                    document.getElementById('client-name').value = data.clientName || '';
                    document.getElementById('client-cid').value = data.clientCid || '';
                    document.getElementById('tracking-template').value = data.trackingTemplate || '';
                    document.getElementById('url-suffix').value = data.urlSuffix || '';
                    data.campaigns.forEach(campaignData => addCampaign(campaignData));
                } catch (error) {
                    alert('Error reading or parsing the JSON file.');
                    console.error(error);
                }
            };
            reader.readAsText(file);
            event.target.value = ''; // Reset input to allow re-uploading the same file
        });

        // --- Form Submission & CSV Generation ---
        multiCampaignForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const csvRows = [];
            const headers = [
                'Campaign', 'Campaign status', 'Budget', 'Campaign Type', 'Networks', 'Bid Strategy Type', 'Ad Group', 'Ad group status',
                'Keyword', 'Match type', 'Criterion Type', 'Final URL', 'Ad type', 'Ad status',
                'Headline 1', 'Headline 2', 'Headline 3', 'Headline 4', 'Headline 5', 'Headline 6', 'Headline 7', 'Headline 8', 'Headline 9', 'Headline 10', 'Headline 11', 'Headline 12', 'Headline 13', 'Headline 14', 'Headline 15',
                'Description 1', 'Description 2', 'Description 3', 'Description 4',
                'Link Text', 'Description Line 1', 'Description Line 2',
                'Header', 'Snippet Values', 'Callout text', 'Phone Number', 'Country of Phone',
                'Promotion item', 'Promotion final URL', 'Promotion type', 'Promotion value', 'Promotion occasion',
                'Location', 'Ad schedule'
            ];
            csvRows.push(headers.join(','));

            document.querySelectorAll('.campaign-item').forEach(campaignEl => {
                const campaignName = getInputValue(campaignEl, '.campaign-name');
                const networks = ['Google search'];
                if (getInputChecked(campaignEl, '.search-partners')) networks.push('Search partners');
                if (getInputChecked(campaignEl, '.display-network')) networks.push('Display');
                
                // --- CAMPAIGN LEVEL ---
                const campaignRow = {
                    'Campaign': campaignName,
                    'Campaign status': getInputValue(campaignEl, '.campaign-status'),
                    'Budget': getInputValue(campaignEl, '.campaign-budget'),
                    'Campaign Type': 'Search',
                    'Networks': networks.join(';'),
                    'Bid Strategy Type': getInputValue(campaignEl, '.bid-strategy'),
                };
                csvRows.push(createCsvRow(campaignRow, headers));

                // Locations, Schedules, Negatives at Campaign Level
                splitTextarea(getInputValue(campaignEl, '.locations')).forEach(loc => csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Location': loc }, headers)));
                splitTextarea(getInputValue(campaignEl, '.ad-schedule')).forEach(sch => csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Ad schedule': sch }, headers)));
                splitTextarea(getInputValue(campaignEl, '.campaign-negatives')).forEach(kw => {
                    const { keyword, matchType } = parseKeyword(kw);
                    csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Keyword': keyword, 'Match type': matchType, 'Criterion Type': 'Negative' }, headers));
                });

                // --- CAMPAIGN EXTENSIONS ---
                campaignEl.querySelectorAll('.call-extension-container .extension-item').forEach(el => csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Phone Number': getInputValue(el, '.call-phone-number'), 'Country of Phone': getInputValue(el, '.call-country') }, headers)));
                campaignEl.querySelectorAll('.callouts-container .extension-item').forEach(el => csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Callout text': getInputValue(el, '.callout-text') }, headers)));
                campaignEl.querySelectorAll('.snippets-container .extension-item').forEach(el => {
                    const snippetValues = Array.from(el.querySelectorAll('.snippet-value')).map(input => input.value.trim()).filter(v => v).join('\n');
                    csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Header': getInputValue(el, '.snippet-header'), 'Snippet Values': snippetValues }, headers));
                });
                campaignEl.querySelectorAll('.promotions-container .extension-item').forEach(el => csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Promotion item': getInputValue(el, '.promo-item'), 'Promotion final URL': getInputValue(el, '.promo-url'), 'Promotion type': getInputValue(el, '.promo-type'), 'Promotion value': getInputValue(el, '.promo-value'), 'Promotion occasion': getInputValue(el, '.promo-occasion') }, headers)));

                // --- AD GROUPS ---
                campaignEl.querySelectorAll('.ad-group-item').forEach(adGroupEl => {
                    const adGroupName = getInputValue(adGroupEl, '.ad-group-name');
                    
                    // Ad Group Row + RSA Ad Row (Combined)
                    const adRow = {
                        'Campaign': campaignName,
                        'Ad Group': adGroupName,
                        'Ad group status': 'Paused',
                        'Final URL': getInputValue(adGroupEl, '.final-url'),
                        'Ad type': 'Responsive search ad',
                        'Ad status': 'Paused'
                    };
                    splitTextarea(getInputValue(adGroupEl, '.rsa-headlines')).slice(0, 15).forEach((h, i) => adRow[`Headline ${i + 1}`] = h);
                    splitTextarea(getInputValue(adGroupEl, '.rsa-descriptions')).slice(0, 4).forEach((d, i) => adRow[`Description ${i + 1}`] = d);
                    csvRows.push(createCsvRow(adRow, headers));

                    // Keywords for this Ad Group
                    splitTextarea(getInputValue(adGroupEl, '.keywords')).forEach(kw => {
                        const { keyword, matchType } = parseKeyword(kw);
                        csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Ad group': adGroupName, 'Keyword': keyword, 'Match type': matchType, 'Criterion Type': 'Keyword' }, headers));
                    });
                    
                    // Negative Keywords for this Ad Group
                    splitTextarea(getInputValue(adGroupEl, '.adgroup-negatives')).forEach(kw => {
                        const { keyword, matchType } = parseKeyword(kw);
                        csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Ad group': adGroupName, 'Keyword': keyword, 'Match type': matchType, 'Criterion Type': 'Negative' }, headers));
                    });
                    
                    // Sitelinks for this Ad Group
                    adGroupEl.querySelectorAll('.sitelinks-container .extension-item').forEach(el => {
                        csvRows.push(createCsvRow({ 'Campaign': campaignName, 'Ad group': adGroupName, 'Link Text': getInputValue(el, '.sitelink-text'), 'Final URL': getInputValue(el, '.sitelink-url'), 'Description Line 1': getInputValue(el, '.sitelink-desc1'), 'Description Line 2': getInputValue(el, '.sitelink-desc2')}, headers));
                    });
                });
            });

            // Download CSV
            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const clientName = (document.getElementById('client-name').value.trim() || 'campaign').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            link.setAttribute("href", url);
            link.setAttribute("download", `google_ads_${clientName}_upload.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
        
        // --- Initialize ---
        addCampaignBtn.addEventListener('click', () => addCampaign());
        addCampaign(); // Start with one campaign
    });