// dual-shortcode-integration.js - Support 2 shortcodes: 888 & 9222

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuration
const GG_POSTBACK_URL = 'https://n.gg.agency/ntf1/?token=3ded788f78058e9ec7f066dfcb166afc&click_id=';

// SMS Configuration cho cả 2 shortcode
const SMS_CONFIG = {
    country: 'vn',
    
    // Support multiple shortcodes
    shortcodes: ['888', '9222', '9199'], // Added 9199 for unsubscriptions
    
    // Package configuration by shortcode
    packages: {
        '888': {
            'BCL5': {
                keywords: ['DK BCL5', 'BCL5', 'DANG KY BCL5'],
                unsubscribe_keywords: ['HUY BCL5', 'CANCEL BCL5'],
                price: '5000',
                description: 'Package BCL5 on shortcode 888 - 5000 VND'
            }
        },
        '9222': {
            'ETC3': {
                keywords: ['ETC3', 'DK ETC3', 'DANG KY ETC3'],
                unsubscribe_keywords: ['HUY ETC', 'HUY ETC3', 'CANCEL ETC'],
                price: '5000',
                description: 'Package ETC3 on shortcode 9222 - 5000 VND'
            }
        },
        '9199': {
            // 9199 is ONLY for unsubscriptions - no subscription packages
            // This shortcode only handles HUY/CANCEL commands
        }
    },
    
    operators: ['viettel', 'vinaphone', 'mobifone', 'vietnamobile'],
    
    // Enhanced validation for multiple shortcodes
    isValidSubscription: function(data) {
        console.log('🔍 Validating subscription data:', {
            shortcode: data.shortcode,
            text: data.text,
            phone: data.msisdn
        });
        
        // Check basic fields
        if (!data.country || data.country.toLowerCase() !== this.country) {
            console.log('❌ Invalid country:', data.country);
            return false;
        }
        
        if (!data.shortcode || !this.shortcodes.includes(data.shortcode)) {
            console.log('❌ Invalid shortcode:', data.shortcode, 'expected one of:', this.shortcodes);
            return false;
        }
        
        if (!data.msisdn || !data.operator || !data.text) {
            console.log('❌ Missing required fields');
            return false;
        }
        
        // Check if operator is supported
        if (!this.operators.includes(data.operator.toLowerCase())) {
            console.log('❌ Unsupported operator:', data.operator);
            return false;
        }
        
        // Check if text matches any package for this shortcode
        const shortcodePackages = this.packages[data.shortcode];
        if (!shortcodePackages || Object.keys(shortcodePackages).length === 0) {
            // Special case: 9199 is unsubscription-only shortcode
            if (data.shortcode === '9199') {
                console.log('✅ Shortcode 9199 is unsubscription-only, skipping package validation');
                return true; // Allow 9199 to pass validation for unsubscription processing
            }
            console.log('❌ No packages defined for shortcode:', data.shortcode);
            return false;
        }
        
        const text = data.text.toUpperCase().trim();
        for (const [packageCode, config] of Object.entries(shortcodePackages)) {
            const matchingKeyword = config.keywords.find(keyword => {
                const upperKeyword = keyword.toUpperCase();
                return text === upperKeyword || text.includes(upperKeyword);
            });
            
            if (matchingKeyword) {
                data.matched_package = packageCode;
                data.matched_keyword = matchingKeyword;
                data.matched_shortcode = data.shortcode;
                console.log('✅ Matched:', {
                    shortcode: data.shortcode,
                    package: packageCode,
                    keyword: matchingKeyword
                });
                return true;
            }
        }
        
        console.log('❌ No matching package found for text:', data.text, 'on shortcode:', data.shortcode);
        return false;
    },
    
    // Get package info by shortcode and text
    getPackageInfo: function(shortcode, text) {
        const upperText = text.toUpperCase().trim();
        
        // Special handling for 9199 unsubscription shortcode
        if (shortcode === '9199') {
            if (upperText.includes('HUY') || upperText.includes('CANCEL')) {
                return {
                    shortcode: shortcode,
                    package_code: 'UNSUBSCRIBE_ETC3',
                    keyword: text,
                    price: '0',
                    description: 'Unsubscribe ETC3 via shortcode 9199',
                    is_unsubscription: true
                };
            }
            return null;
        }
        
        // Check for unsubscription keywords first
        if (upperText.includes('HUY') || upperText.includes('CANCEL')) {
            // Handle unsubscription for each shortcode
            if (shortcode === '888' && upperText.includes('BCL5')) {
                return {
                    shortcode: shortcode,
                    package_code: 'UNSUBSCRIBE_BCL5',
                    keyword: text,
                    price: '0',
                    description: 'Unsubscribe BCL5 via shortcode 888',
                    is_unsubscription: true
                };
            }
            if (shortcode === '9222' && (upperText.includes('ETC') || upperText.includes('ETC3'))) {
                return {
                    shortcode: shortcode,
                    package_code: 'UNSUBSCRIBE_ETC3',
                    keyword: text,
                    price: '0',
                    description: 'Unsubscribe ETC3 via shortcode 9222',
                    is_unsubscription: true
                };
            }
        }
        
        // Handle subscription keywords
        const shortcodePackages = this.packages[shortcode];
        if (!shortcodePackages) return null;
        
        for (const [packageCode, config] of Object.entries(shortcodePackages)) {
            const matchingKeyword = config.keywords.find(keyword => {
                const upperKeyword = keyword.toUpperCase();
                return upperText === upperKeyword || upperText.includes(upperKeyword);
            });
            
            if (matchingKeyword) {
                return {
                    shortcode: shortcode,
                    package_code: packageCode,
                    keyword: matchingKeyword,
                    price: config.price,
                    description: config.description,
                    is_unsubscription: false
                };
            }
        }
        return null;
    },
    
    // Get all packages info for display
    getAllPackages: function() {
        const allPackages = [];
        for (const [shortcode, packages] of Object.entries(this.packages)) {
            for (const [packageCode, config] of Object.entries(packages)) {
                allPackages.push({
                    shortcode: shortcode,
                    package_code: packageCode,
                    keywords: config.keywords,
                    unsubscribe_keywords: config.unsubscribe_keywords,
                    price: config.price,
                    description: config.description
                });
            }
        }
        return allPackages;
    }
};

// Storage
const leads = new Map();
const subscriptions = new Map();
const conversions = new Map();

// Statistics
let totalSubscriptions = 0;
let totalConversions = 0;
let totalPostbacks = 0;

// Statistics by shortcode and package
const statsByShortcode = {
    '888': { subscriptions: 0, conversions: 0, unsubscriptions: 0 },
    '9222': { subscriptions: 0, conversions: 0, unsubscriptions: 0 },
    '9199': { subscriptions: 0, conversions: 0, unsubscriptions: 0 }
};

// 1. API nhận lead từ frontend
app.post('/api/save-lead', (req, res) => {
    try {
        const { phone, click_id, timestamp, source, user_agent, preferred_shortcode } = req.body;
        
        if (!phone || !click_id) {
            return res.status(400).json({
                success: false,
                error: 'Phone and click_id are required'
            });
        }
        
        const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const normalizedPhone = normalizePhoneNumber(phone);
        
        const leadData = {
            leadId,
            phone: normalizedPhone,
            original_phone: phone,
            click_id,
            timestamp,
            source: source || 'website',
            user_agent,
            preferred_shortcode: preferred_shortcode || null,
            status: 'pending',
            created_at: new Date().toISOString(),
            subscription_data: null,
            conversion_sent: false
        };
        
        // Store with multiple keys for easy lookup
        leads.set(leadId, leadData);
        leads.set(normalizedPhone, leadData);
        leads.set(`phone_${normalizedPhone}`, leadData);
        
        console.log('📝 Lead saved:', {
            leadId,
            phone: normalizedPhone,
            original: phone,
            click_id,
            preferred_shortcode
        });
        
        // Get all available packages for response
        const allPackages = SMS_CONFIG.getAllPackages();
        
        res.json({
            success: true,
            leadId,
            normalized_phone: normalizedPhone,
            message: 'Lead saved, waiting for SMS',
            sms_options: allPackages.map(pkg => ({
                shortcode: pkg.shortcode,
                keyword: pkg.keywords[0], // Primary keyword
                package: pkg.package_code,
                price: pkg.price,
                example: `SMS: ${pkg.keywords[0]} gửi ${pkg.shortcode}`
            }))
        });
        
    } catch (error) {
        console.error('❌ Error saving lead:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 2. WEBHOOK ENDPOINT - Nhận subscription từ telco (cả 2 shortcode)
app.post('/api/telco-webhook/subscriptions', async (req, res) => {
    try {
        console.log('📨 Subscription webhook received:', JSON.stringify(req.body, null, 2));
        
        if (!Array.isArray(req.body)) {
            console.error('❌ Invalid webhook format - expected array');
            return res.status(400).json({
                success: false,
                error: 'Expected array of subscription objects'
            });
        }
        
        const subscriptions = req.body;
        let processedCount = 0;
        let convertedCount = 0;
        const results = [];
        
        // Process each subscription
        for (const subscription of subscriptions) {
            try {
                const result = await processSubscription(subscription);
                results.push({
                    shortcode: subscription.shortcode,
                    phone: subscription.msisdn,
                    text: subscription.text,
                    processed: result.processed,
                    converted: result.converted,
                    package: result.package_info?.package_code,
                    reason: result.reason || 'success'
                });
                
                processedCount++;
                if (result.converted) {
                    convertedCount++;
                }
                
            } catch (error) {
                console.error('❌ Error processing subscription:', subscription, error);
                results.push({
                    shortcode: subscription.shortcode,
                    phone: subscription.msisdn,
                    processed: false,
                    error: error.message
                });
            }
        }
        
        console.log(`✅ Webhook processed: ${processedCount} subscriptions, ${convertedCount} conversions`);
        
        res.json({
            success: true,
            message: 'Subscriptions processed successfully',
            processed: processedCount,
            converted: convertedCount,
            results: results,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Webhook processing error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 3. WEBHOOK ENDPOINT - Nhận unsubscription từ telco
app.post('/api/telco-webhook/unsubscriptions', async (req, res) => {
    try {
        console.log('📨 Unsubscription webhook received:', JSON.stringify(req.body, null, 2));
        
        if (!Array.isArray(req.body)) {
            return res.status(400).json({
                success: false,
                error: 'Expected array of unsubscription objects'
            });
        }
        
        const unsubscriptions = req.body;
        
        for (const unsub of unsubscriptions) {
            console.log('📤 Unsubscription logged:', {
                shortcode: unsub.shortcode,
                phone: unsub.msisdn,
                text: unsub.text,
                package: unsub.packagecode,
                operator: unsub.operator,
                timestamp: new Date().toISOString()
            });
            
            // Track unsubscription statistics
            if (statsByShortcode[unsub.shortcode] && statsByShortcode[unsub.shortcode].unsubscriptions !== undefined) {
                statsByShortcode[unsub.shortcode].unsubscriptions++;
            }
        }
        
        res.json({
            success: true,
            message: 'Unsubscriptions logged successfully',
            count: unsubscriptions.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Unsubscription webhook error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 4. Process individual subscription (support cả 2 shortcode)
async function processSubscription(subscriptionData) {
    try {
        console.log('⚙️ Processing subscription:', {
            shortcode: subscriptionData.shortcode,
            phone: subscriptionData.msisdn,
            text: subscriptionData.text,
            operator: subscriptionData.operator
        });
        
        // Validate subscription
        if (!SMS_CONFIG.isValidSubscription(subscriptionData)) {
            console.log('⚠️ Invalid subscription data, skipping');
            return { 
                processed: true, 
                converted: false, 
                reason: 'invalid_subscription_data' 
            };
        }
        
        // Get package info
        const packageInfo = SMS_CONFIG.getPackageInfo(subscriptionData.shortcode, subscriptionData.text);
        
        // Handle unsubscription (any shortcode)
        if (packageInfo && packageInfo.is_unsubscription) {
            console.log('📤 Processing unsubscription:', {
                shortcode: subscriptionData.shortcode,
                phone: subscriptionData.msisdn,
                text: subscriptionData.text,
                package: packageInfo.package_code
            });
            
            // Log unsubscription but don't process as conversion
            totalSubscriptions++;
            subscriptions.set(`unsub_${Date.now()}_${normalizePhoneNumber(subscriptionData.msisdn)}`, {
                ...subscriptionData,
                package_info: packageInfo,
                normalized_phone: normalizePhoneNumber(subscriptionData.msisdn),
                is_unsubscription: true,
                processed_at: new Date().toISOString()
            });
            
            // Update unsubscription statistics
            if (statsByShortcode[subscriptionData.shortcode] && statsByShortcode[subscriptionData.shortcode].unsubscriptions !== undefined) {
                statsByShortcode[subscriptionData.shortcode].unsubscriptions++;
            }
            
            return { 
                processed: true, 
                converted: false, 
                reason: 'unsubscription_processed',
                package_info: packageInfo
            };
        }
        
        if (!packageInfo) {
            console.log('⚠️ No package info found for:', {
                shortcode: subscriptionData.shortcode,
                text: subscriptionData.text
            });
            return { 
                processed: true, 
                converted: false, 
                reason: 'unknown_package' 
            };
        }
        
        // Update statistics
        if (statsByShortcode[subscriptionData.shortcode]) {
            statsByShortcode[subscriptionData.shortcode].subscriptions++;
        }
        
        // Normalize phone number
        const normalizedPhone = normalizePhoneNumber(subscriptionData.msisdn);
        
        // Find matching lead
        const lead = findMatchingLead(normalizedPhone);
        
        if (!lead) {
            console.log('⚠️ No matching lead found for phone:', normalizedPhone);
            
            // Log unmatched subscription for analytics
            totalSubscriptions++;
            subscriptions.set(`sub_${Date.now()}_${normalizedPhone}`, {
                ...subscriptionData,
                package_info: packageInfo,
                normalized_phone: normalizedPhone,
                lead_found: false,
                processed_at: new Date().toISOString()
            });
            
            return { 
                processed: true, 
                converted: false, 
                reason: 'no_matching_lead',
                package_info: packageInfo
            };
        }
        
        console.log('🎯 Found matching lead:', {
            leadId: lead.leadId,
            click_id: lead.click_id,
            phone: normalizedPhone,
            shortcode: packageInfo.shortcode,
            package: packageInfo.package_code
        });
        
        // Update lead with subscription data
        lead.status = 'converted';
        lead.subscription_data = subscriptionData;
        lead.package_info = packageInfo;
        lead.conversion_timestamp = subscriptionData.date_time || new Date().toISOString();
        lead.subscription_id = `sub_${Date.now()}_${normalizedPhone}`;
        
        // Store subscription record
        totalSubscriptions++;
        subscriptions.set(lead.subscription_id, {
            ...subscriptionData,
            package_info: packageInfo,
            lead_id: lead.leadId,
            click_id: lead.click_id,
            normalized_phone: normalizedPhone,
            processed_at: new Date().toISOString()
        });
        
        // Send postback to GG.Agency
        const postbackSuccess = await sendPostbackToGG(lead.click_id, lead, subscriptionData, packageInfo);
        
        if (postbackSuccess) {
            lead.conversion_sent = true;
            lead.postback_timestamp = new Date().toISOString();
            
            totalConversions++;
            totalPostbacks++;
            
            // Update shortcode statistics
            if (statsByShortcode[subscriptionData.shortcode]) {
                statsByShortcode[subscriptionData.shortcode].conversions++;
            }
            
            // Store conversion record
            conversions.set(lead.subscription_id, {
                leadId: lead.leadId,
                click_id: lead.click_id,
                phone: normalizedPhone,
                subscription_data: subscriptionData,
                package_info: packageInfo,
                postback_sent: true,
                postback_timestamp: new Date().toISOString()
            });
            
            console.log('✅ Dual-shortcode conversion completed:', {
                leadId: lead.leadId,
                subscriptionId: lead.subscription_id,
                clickId: lead.click_id,
                shortcode: packageInfo.shortcode,
                package: packageInfo.package_code,
                price: packageInfo.price
            });
        }
        
        return { 
            processed: true, 
            converted: true, 
            package_info: packageInfo 
        };
        
    } catch (error) {
        console.error('❌ Error processing subscription:', error);
        return { 
            processed: false, 
            converted: false, 
            reason: error.message 
        };
    }
}

// 5. Normalize phone number (same as before)
function normalizePhoneNumber(phone) {
    if (!phone) return '';
    
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('84')) {
        cleaned = '0' + cleaned.substr(2);
    } else if (cleaned.startsWith('0')) {
        cleaned = cleaned;
    } else if (cleaned.length === 9) {
        cleaned = '0' + cleaned;
    }
    
    return cleaned;
}

// 6. Find matching lead (same as before)
function findMatchingLead(normalizedPhone) {
    let lead = leads.get(normalizedPhone);
    if (lead && lead.leadId) return lead;
    
    lead = leads.get(`phone_${normalizedPhone}`);
    if (lead && lead.leadId) return lead;
    
    for (const [key, leadData] of leads.entries()) {
        if (leadData.leadId && leadData.phone === normalizedPhone) {
            return leadData;
        }
    }
    
    return null;
}

// 7. Send postback to GG.Agency (enhanced với package info)
async function sendPostbackToGG(clickId, leadData, subscriptionData, packageInfo) {
    try {
        // Enhanced postback URL with package info
        const basePostbackUrl = GG_POSTBACK_URL + clickId;
        const enhancedUrl = `${basePostbackUrl}&shortcode=${packageInfo.shortcode}&package=${packageInfo.package_code}&price=${packageInfo.price}`;
        
        console.log('📤 Sending enhanced postback to GG.Agency:', {
            url: enhancedUrl,
            leadId: leadData.leadId,
            phone: leadData.phone,
            shortcode: packageInfo.shortcode,
            package: packageInfo.package_code,
            price: packageInfo.price,
            operator: subscriptionData.operator
        });
        
        const response = await axios.get(enhancedUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Dual-SMS-Integration/1.0'
            }
        });
        
        console.log('✅ GG.Agency postback response:', {
            status: response.status,
            clickId: clickId,
            leadId: leadData.leadId,
            shortcode: packageInfo.shortcode,
            package: packageInfo.package_code
        });
        
        return true;
        
    } catch (error) {
        console.error('❌ Postback error:', error.message);
        
        // Retry mechanism
        setTimeout(async () => {
            try {
                await axios.get(GG_POSTBACK_URL + clickId, { timeout: 10000 });
                console.log('✅ Postback retry successful:', clickId);
            } catch (retryError) {
                console.error('❌ Postback retry failed:', clickId);
            }
        }, 5000);
        
        return false;
    }
}

// 8. Test subscription endpoint (support cả 2 shortcode)
app.post('/api/test-subscription', async (req, res) => {
    const { shortcode, text, phone, operator } = req.body;
    
    if (!shortcode || !SMS_CONFIG.shortcodes.includes(shortcode)) {
        return res.status(400).json({
            success: false,
            error: `Invalid shortcode. Must be one of: ${SMS_CONFIG.shortcodes.join(', ')}`
        });
    }
    
    const testData = {
        country: 'vn',
        shortcode: shortcode,
        text: text || (shortcode === '888' ? 'DK BCL5' : 'ETC3'),
        packagecode: 'xxx',
        msisdn: phone || '84987654321',
        operator: operator || 'mobifone',
        price: '5000',
        date_time: new Date().toISOString(),
        rid: ''
    };
    
    console.log('🧪 Testing subscription with data:', testData);
    
    const result = await processSubscription(testData);
    
    res.json({
        success: true,
        message: 'Test subscription processed',
        test_data: testData,
        result: result,
        timestamp: new Date().toISOString()
    });
});

// 9. Enhanced Statistics API
app.get('/api/stats', (req, res) => {
    const allLeads = Array.from(leads.values()).filter(l => l.leadId);
    const allSubscriptions = Array.from(subscriptions.values());
    const allConversions = Array.from(conversions.values());
    
    // Stats by package
    const statsByPackage = {};
    for (const subscription of allSubscriptions) {
        const pkg = subscription.package_info?.package_code || 'unknown';
        const shortcode = subscription.package_info?.shortcode || 'unknown';
        const key = `${shortcode}-${pkg}`;
        
        if (!statsByPackage[key]) {
            statsByPackage[key] = {
                shortcode: shortcode,
                package: pkg,
                subscriptions: 0,
                conversions: 0
            };
        }
        statsByPackage[key].subscriptions++;
        
        if (subscription.lead_id) {
            statsByPackage[key].conversions++;
        }
    }
    
    const stats = {
        timestamp: new Date().toISOString(),
        config: {
            shortcodes: SMS_CONFIG.shortcodes,
            country: SMS_CONFIG.country,
            packages: SMS_CONFIG.getAllPackages()
        },
        leads: {
            total: allLeads.length,
            pending: allLeads.filter(l => l.status === 'pending').length,
            converted: allLeads.filter(l => l.status === 'converted').length
        },
        subscriptions: {
            total: totalSubscriptions,
            with_leads: allSubscriptions.filter(s => s.lead_id).length,
            without_leads: allSubscriptions.filter(s => !s.lead_id).length,
            by_shortcode: statsByShortcode,
            by_package: statsByPackage
        },
        conversions: {
            total: totalConversions,
            postback_sent: totalPostbacks,
            postback_failed: totalConversions - totalPostbacks
        },
        performance: {
            conversion_rate: allLeads.length > 0 ? 
                (totalConversions / allLeads.length * 100).toFixed(2) + '%' : '0%',
            postback_success_rate: totalConversions > 0 ?
                (totalPostbacks / totalConversions * 100).toFixed(2) + '%' : '0%'
        }
    };
    
    res.json(stats);
});

// Health check
app.get('/', (req, res) => {
    const allPackages = SMS_CONFIG.getAllPackages();
    
    res.json({
        status: 'Dual SMS Tracking System - Shortcodes 888 & 9222',
        timestamp: new Date().toISOString(),
        config: {
            shortcodes: SMS_CONFIG.shortcodes,
            packages: allPackages,
            operators: SMS_CONFIG.operators
        },
        statistics: {
            total_subscriptions: totalSubscriptions,
            total_conversions: totalConversions,
            total_postbacks: totalPostbacks,
            by_shortcode: statsByShortcode
        },
        endpoints: {
            'POST /api/save-lead': 'Save lead from website',
            'POST /api/telco-webhook/subscriptions': 'Receive subscription webhook',
            'POST /api/telco-webhook/unsubscriptions': 'Receive unsubscription webhook',
            'POST /api/test-subscription': 'Test subscription processing',
            'GET /api/stats': 'View detailed statistics'
        },
        sms_instructions: allPackages.map(pkg => ({
            shortcode: pkg.shortcode,
            keyword: pkg.keywords[0],
            package: pkg.package_code,
            price: pkg.price,
            example: `SMS: ${pkg.keywords[0]} gửi ${pkg.shortcode}`
        }))
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Triple SMS Tracking System running on port ${PORT}`);
    console.log('📱 Supported SMS commands:');
    console.log('  ✅ 888: DK BCL5 → Subscribe BCL5 → 5000 VND → Postback');
    console.log('  ✅ 888: HUY BCL5 → Unsubscribe BCL5 → Free → No postback');
    console.log('  ✅ 9222: ETC3 → Subscribe ETC3 → 5000 VND → Postback');
    console.log('  ✅ 9199: HUY ETC → Unsubscribe ETC3 → Free → No postback');
    console.log('📍 Webhook URLs ready:');
    console.log(`  ✅ All webhooks: POST /api/telco-webhook/subscriptions`);
    console.log(`  ✅ Unsubscriptions: POST /api/telco-webhook/unsubscriptions`);
    console.log('🎯 System ready for complete SMS integration!');
});

module.exports = { 
    processSubscription, 
    normalizePhoneNumber, 
    sendPostbackToGG,
    SMS_CONFIG
};
