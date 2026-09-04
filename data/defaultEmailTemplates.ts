import { EmailTemplate, Settings } from '../types';

export const DEFAULT_EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
    booking_confirmed: {
        id: 'booking_confirmed',
        name: 'Customer Booking Confirmation',
        category: 'Bookings',
        description: 'Sent automatically to the customer when a service, car rental, or driver booking is placed and confirmed.',
        enabled: true,
        subject: 'Booking Confirmed: #{{bookingId}} - {{serviceName}}',
        variables: ['customerName', 'bookingId', 'serviceName', 'date', 'time', 'totalAmount', 'paymentMethod', 'appName', 'supportEmail', 'supportPhone'],
        body: `
<h2>Hello {{customerName}},</h2>
<p>Thank you for choosing <strong>{{appName}}</strong>! Your booking has been successfully confirmed. Below are your booking details:</p>

<div class="card">
    <table class="detail-table">
        <tr>
            <td class="label">Booking ID:</td>
            <td class="value"><strong>#{{bookingId}}</strong></td>
        </tr>
        <tr>
            <td class="label">Service / Package:</td>
            <td class="value">{{serviceName}}</td>
        </tr>
        <tr>
            <td class="label">Schedule Date:</td>
            <td class="value">{{date}} at {{time}}</td>
        </tr>
        <tr>
            <td class="label">Total Amount:</td>
            <td class="value highlight">₱{{totalAmount}}</td>
        </tr>
        <tr>
            <td class="label">Payment Method:</td>
            <td class="value">{{paymentMethod}}</td>
        </tr>
    </table>
</div>

<p>You can track the live progress and driver/mechanic updates in real-time from your Customer Portal.</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/customer-portal/booking-history" class="button">View My Booking</a>
</div>

<p>If you have any questions or need to make adjustments, reach out to our team at <a href="mailto:{{supportEmail}}">{{supportEmail}}</a> or call {{supportPhone}}.</p>

<p>Ride safe,<br><strong>Team {{appName}}</strong></p>
        `.trim()
    },

    admin_new_booking: {
        id: 'admin_new_booking',
        name: 'Admin New Booking Alert',
        category: 'Operations',
        description: 'Sent to the Operations and Dispatch team immediately when a new customer request or booking is submitted.',
        enabled: true,
        subject: '🚨 New Booking Alert [#{{bookingId}}] - {{serviceName}} ({{customerName}})',
        variables: ['customerName', 'customerPhone', 'customerEmail', 'bookingId', 'serviceName', 'date', 'time', 'totalAmount', 'pickupLocation', 'appName'],
        body: `
<h2>New Booking Received!</h2>
<p>A new customer booking has been placed and requires operational monitoring or dispatch.</p>

<div class="card">
    <table class="detail-table">
        <tr>
            <td class="label">Booking ID:</td>
            <td class="value"><strong>#{{bookingId}}</strong></td>
        </tr>
        <tr>
            <td class="label">Customer Name:</td>
            <td class="value">{{customerName}}</td>
        </tr>
        <tr>
            <td class="label">Contact Info:</td>
            <td class="value">{{customerPhone}} &bull; {{customerEmail}}</td>
        </tr>
        <tr>
            <td class="label">Service:</td>
            <td class="value">{{serviceName}}</td>
        </tr>
        <tr>
            <td class="label">Date & Time:</td>
            <td class="value">{{date}} @ {{time}}</td>
        </tr>
        <tr>
            <td class="label">Amount:</td>
            <td class="value highlight">₱{{totalAmount}}</td>
        </tr>
        <tr>
            <td class="label">Pickup / Address:</td>
            <td class="value">{{pickupLocation}}</td>
        </tr>
    </table>
</div>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/admin-portal/bookings" class="button">Open Admin Dispatch Board</a>
</div>
        `.trim()
    },

    driver_assigned: {
        id: 'driver_assigned',
        name: 'Driver Assigned & Trip Details',
        category: 'Drivers & Fleet',
        description: 'Sent to the customer when a professional driver is assigned to their Driver for Hire or Car Rental booking.',
        enabled: true,
        subject: 'Driver Assigned: {{driverName}} is scheduled for your booking #{{bookingId}}',
        variables: ['customerName', 'bookingId', 'driverName', 'driverPhone', 'eta', 'pickupLocation', 'destination', 'appName', 'supportPhone'],
        body: `
<h2>Great news, {{customerName}}!</h2>
<p>A certified professional driver has been assigned to your booking with <strong>{{appName}}</strong>.</p>

<div class="card">
    <div style="margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
        <h3 style="margin: 0 0 5px 0; color: #FF7900;">Assigned Driver Profile</h3>
        <p style="margin: 0; font-size: 15px; font-weight: bold; color: #ffffff;">{{driverName}}</p>
        <p style="margin: 3px 0 0 0; color: #a0a0a0; font-size: 13px;">Direct Contact: <a href="tel:{{driverPhone}}" style="color: #FF7900; font-weight: bold;">{{driverPhone}}</a></p>
    </div>

    <table class="detail-table">
        <tr>
            <td class="label">Booking Ref:</td>
            <td class="value">#{{bookingId}}</td>
        </tr>
        <tr>
            <td class="label">Estimated Arrival:</td>
            <td class="value highlight">{{eta}}</td>
        </tr>
        <tr>
            <td class="label">Pickup Point:</td>
            <td class="value">{{pickupLocation}}</td>
        </tr>
        <tr>
            <td class="label">Destination:</td>
            <td class="value">{{destination}}</td>
        </tr>
    </table>
</div>

<p>Your driver will reach out prior to arrival. You can also view live GPS tracking directly from your app.</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/customer-portal/booking-history" class="button">Track Driver Live</a>
</div>

<p>Need support? Call our hotline at <strong>{{supportPhone}}</strong>.</p>
        `.trim()
    },

    mechanic_assigned: {
        id: 'mechanic_assigned',
        name: 'Mechanic Dispatched Alert',
        category: 'Bookings',
        description: 'Sent when a certified technician/mechanic is assigned and en route to the customer location.',
        enabled: true,
        subject: 'Mechanic On The Way: {{mechanicName}} assigned to #{{bookingId}}',
        variables: ['customerName', 'bookingId', 'mechanicName', 'mechanicPhone', 'serviceName', 'eta', 'vehicleInfo', 'appName'],
        body: `
<h2>Hello {{customerName}},</h2>
<p>Your service technician has been assigned and is preparing your service order.</p>

<div class="card">
    <table class="detail-table">
        <tr>
            <td class="label">Mechanic Name:</td>
            <td class="value"><strong>{{mechanicName}}</strong></td>
        </tr>
        <tr>
            <td class="label">Mechanic Contact:</td>
            <td class="value"><a href="tel:{{mechanicPhone}}" style="color: #FF7900;">{{mechanicPhone}}</a></td>
        </tr>
        <tr>
            <td class="label">Service Requested:</td>
            <td class="value">{{serviceName}}</td>
        </tr>
        <tr>
            <td class="label">Vehicle:</td>
            <td class="value">{{vehicleInfo}}</td>
        </tr>
        <tr>
            <td class="label">Estimated Time:</td>
            <td class="value highlight">{{eta}}</td>
        </tr>
    </table>
</div>

<p>Please make sure the vehicle is accessible at the scheduled service location.</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/customer-portal/booking-history" class="button">View Service Status</a>
</div>
        `.trim()
    },

    booking_in_progress: {
        id: 'booking_in_progress',
        name: 'Service In-Progress / Live Update',
        category: 'Bookings',
        description: 'Sent when the technician or driver arrives and officially begins the service or trip.',
        enabled: true,
        subject: 'Service In Progress: Booking #{{bookingId}} - {{serviceName}}',
        variables: ['customerName', 'bookingId', 'serviceName', 'status', 'liveTrackingUrl', 'appName'],
        body: `
<h2>Hello {{customerName}},</h2>
<p>Your booking <strong>#{{bookingId}}</strong> is now actively <strong>{{status}}</strong>.</p>

<div class="card">
    <p style="margin: 0; font-size: 14px; color: #ffffff;">Our team is currently performing the requested <strong>{{serviceName}}</strong>.</p>
    <p style="margin: 8px 0 0 0; color: #a0a0a0; font-size: 12px;">All tasks are logged in real-time. You will receive a full inspection report and receipt once complete.</p>
</div>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/customer-portal/booking-history" class="button">Open Live Dashboard</a>
</div>
        `.trim()
    },

    booking_completed: {
        id: 'booking_completed',
        name: 'Service Completion & Receipt',
        category: 'Bookings',
        description: 'Sent immediately upon job completion with the final summary and official digital receipt.',
        enabled: true,
        subject: 'Service Completed: Receipt for #{{bookingId}} - {{serviceName}}',
        variables: ['customerName', 'bookingId', 'serviceName', 'totalPaid', 'completionDate', 'appName', 'feedbackUrl'],
        body: `
<h2>Thank you, {{customerName}}!</h2>
<p>Your booking <strong>#{{bookingId}}</strong> ({{serviceName}}) has been marked as <strong>COMPLETED</strong>.</p>

<div class="card">
    <h3 style="margin: 0 0 10px 0; color: #22c55e;">Payment & Job Summary</h3>
    <table class="detail-table">
        <tr>
            <td class="label">Job Reference:</td>
            <td class="value">#{{bookingId}}</td>
        </tr>
        <tr>
            <td class="label">Completion Date:</td>
            <td class="value">{{completionDate}}</td>
        </tr>
        <tr>
            <td class="label">Service Name:</td>
            <td class="value">{{serviceName}}</td>
        </tr>
        <tr>
            <td class="label">Total Paid:</td>
            <td class="value highlight">₱{{totalPaid}}</td>
        </tr>
        <tr>
            <td class="label">Status:</td>
            <td class="value" style="color: #22c55e; font-weight: bold;">Fully Paid & Settled</td>
        </tr>
    </table>
</div>

<p>How was your experience? Your feedback helps us maintain the highest standards for all riders.</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/customer-portal/booking-history" class="button">Rate & Review Service</a>
</div>

<p>Thank you for trusting <strong>{{appName}}</strong>!</p>
        `.trim()
    },

    booking_cancelled: {
        id: 'booking_cancelled',
        name: 'Cancellation & Refund Notice',
        category: 'Bookings',
        description: 'Sent when a booking is cancelled by customer or admin with reason and refund status.',
        enabled: true,
        subject: 'Booking Cancelled: Notice for #{{bookingId}}',
        variables: ['customerName', 'bookingId', 'serviceName', 'reason', 'refundStatus', 'appName', 'supportEmail'],
        body: `
<h2>Hello {{customerName}},</h2>
<p>Your booking <strong>#{{bookingId}}</strong> for <strong>{{serviceName}}</strong> has been cancelled.</p>

<div class="card">
    <table class="detail-table">
        <tr>
            <td class="label">Booking ID:</td>
            <td class="value">#{{bookingId}}</td>
        </tr>
        <tr>
            <td class="label">Cancellation Reason:</td>
            <td class="value">{{reason}}</td>
        </tr>
        <tr>
            <td class="label">Refund Status:</td>
            <td class="value highlight">{{refundStatus}}</td>
        </tr>
    </table>
</div>

<p>If you believe this cancellation was made in error, or if you need assistance rescheduling, please reply to this email or contact <a href="mailto:{{supportEmail}}">{{supportEmail}}</a>.</p>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/customer-portal/services" class="button">Book New Service</a>
</div>
        `.trim()
    },

    order_confirmation: {
        id: 'order_confirmation',
        name: 'Parts Store Order Confirmation',
        category: 'E-Commerce',
        description: 'Sent when customer purchases replacement parts, accessories, or consumables from the Parts Store.',
        enabled: true,
        subject: 'Order Confirmed: #{{orderId}} from {{appName}} Store',
        variables: ['customerName', 'orderId', 'itemsList', 'totalAmount', 'paymentMethod', 'deliveryAddress', 'appName'],
        body: `
<h2>Thank you for your order, {{customerName}}!</h2>
<p>We have received your parts order and our warehouse team is preparing your items for delivery.</p>

<div class="card">
    <table class="detail-table">
        <tr>
            <td class="label">Order Number:</td>
            <td class="value"><strong>#{{orderId}}</strong></td>
        </tr>
        <tr>
            <td class="label">Items:</td>
            <td class="value">{{itemsList}}</td>
        </tr>
        <tr>
            <td class="label">Total Paid:</td>
            <td class="value highlight">₱{{totalAmount}}</td>
        </tr>
        <tr>
            <td class="label">Payment:</td>
            <td class="value">{{paymentMethod}}</td>
        </tr>
        <tr>
            <td class="label">Delivery Address:</td>
            <td class="value">{{deliveryAddress}}</td>
        </tr>
    </table>
</div>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/customer-portal/order-history" class="button">Track Order Status</a>
</div>
        `.trim()
    },

    mechanic_verified: {
        id: 'mechanic_verified',
        name: 'Mechanic Application Approved',
        category: 'Accounts',
        description: 'Sent to onboarding mechanics when their credentials, IDs, and background checks are verified by Admin.',
        enabled: true,
        subject: '🎉 Congratulations! Your Mechanic Application at {{appName}} is Approved',
        variables: ['mechanicName', 'loginUrl', 'onboardingNotes', 'appName', 'supportPhone'],
        body: `
<h2>Welcome aboard, {{mechanicName}}!</h2>
<p>Congratulations! Your mechanic profile and documents have been reviewed and <strong>APPROVED</strong> by the {{appName}} verification team.</p>

<div class="card">
    <h3 style="margin: 0 0 10px 0; color: #22c55e;">Account Activated</h3>
    <p style="margin: 0; font-size: 13px; color: #e0e0e0;">You can now log in to the Mechanic Portal, set your live availability, view nearby service dispatch requests, and start earning.</p>
    <p style="margin: 8px 0 0 0; font-size: 12px; color: #a0a0a0;">{{onboardingNotes}}</p>
</div>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{loginUrl}}" class="button">Go to Mechanic Portal</a>
</div>

<p>Need assistance getting started? Call our dispatch support at {{supportPhone}}.</p>
        `.trim()
    },

    welcome_customer: {
        id: 'welcome_customer',
        name: 'Customer Welcome & Onboarding',
        category: 'Accounts',
        description: 'Sent to newly registered customers with an overview of available auto services, rentals, and store features.',
        enabled: true,
        subject: 'Welcome to {{appName}} - Your Complete Auto Care & Mobility Partner!',
        variables: ['customerName', 'userEmail', 'appName', 'supportEmail'],
        body: `
<h2>Welcome to {{appName}}, {{customerName}}!</h2>
<p>We are thrilled to have you with us. With {{appName}}, taking care of your vehicle and finding professional mobility services is easier than ever.</p>

<div class="card">
    <h3 style="margin: 0 0 10px 0; color: #FF7900;">Explore What You Can Do</h3>
    <ul style="margin: 0; padding-left: 20px; color: #e0e0e0; font-size: 13px; line-height: 1.6;">
        <li><strong>On-Demand Mechanic Service</strong>: Book home or roadside repairs with certified experts.</li>
        <li><strong>Car Rental Fleet</strong>: Self-drive or with professional driver options.</li>
        <li><strong>Driver for Hire</strong>: Dedicated hourly or daily drivers on standby.</li>
        <li><strong>LTO Liaison Services</strong>: Hassle-free renewal, transfer, and registration processing.</li>
        <li><strong>Parts & Accessories Store</strong>: Genuine parts delivered to your doorstep.</li>
    </ul>
</div>

<div style="text-align: center; margin: 30px 0;">
    <a href="{{appUrl}}/customer-portal/home" class="button">Explore Services Now</a>
</div>

<p>Ride safe,<br><strong>The {{appName}} Team</strong></p>
        `.trim()
    }
};

/**
 * Wraps raw email HTML inside a clean, modern, responsive email layout with custom brand accent colors
 */
export const wrapInEmailLayout = (content: string, settings?: Settings, subjectTitle?: string): string => {
    const appName = settings?.appName || 'RidersBUD';
    const accentColor = settings?.accentColor || '#FF7900';
    const contactEmail = settings?.contactEmail || 'support@ridersbud.com';
    const contactPhone = settings?.contactPhone || '0917-123-4567';

    const emailLogo = settings?.emailLogoUrl || settings?.appLogoUrl;
    const headerLogoHtml = emailLogo
        ? `<img src="${emailLogo}" alt="${appName}" style="max-height: 52px; max-width: 220px; object-fit: contain; display: block; margin: 0 auto;" />`
        : `<div class="logo-text">${appName.slice(0, -3)}<span>${appName.slice(-3)}</span></div>`;

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subjectTitle || appName}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #0d0d10;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #ffffff;
            -webkit-font-smoothing: antialiased;
        }
        .wrapper {
            width: 100%;
            background-color: #0d0d10;
            padding: 30px 10px;
            box-sizing: border-box;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #141418;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
            padding: 30px 24px;
            text-align: center;
            background: linear-gradient(180deg, rgba(255, 121, 0, 0.15) 0%, rgba(20, 20, 24, 0) 100%);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }
        .logo-text {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #ffffff;
            text-transform: uppercase;
        }
        .logo-text span {
            color: ${accentColor};
        }
        .content {
            padding: 30px 24px;
            color: #d1d5db;
            font-size: 14px;
            line-height: 1.6;
        }
        h2 {
            color: #ffffff;
            font-size: 20px;
            font-weight: 800;
            margin-top: 0;
            margin-bottom: 16px;
            letter-spacing: -0.3px;
        }
        p {
            margin-top: 0;
            margin-bottom: 16px;
        }
        .card {
            background-color: #1c1c22;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            padding: 18px;
            margin: 20px 0;
        }
        .detail-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }
        .detail-table td {
            padding: 8px 0;
            vertical-align: top;
            border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .detail-table tr:last-child td {
            border-bottom: none;
        }
        .detail-table td.label {
            color: #9ca3af;
            font-weight: 600;
            width: 38%;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
        }
        .detail-table td.value {
            color: #ffffff;
        }
        .detail-table td.highlight {
            color: ${accentColor};
            font-weight: 800;
            font-size: 16px;
        }
        .button {
            display: inline-block;
            background-color: ${accentColor};
            color: #ffffff !important;
            font-weight: 800;
            font-size: 13px;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 14px rgba(255, 121, 0, 0.3);
        }
        .footer {
            padding: 24px;
            text-align: center;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            background-color: #0f0f12;
            font-size: 11px;
            color: #6b7280;
        }
        .footer a {
            color: ${accentColor};
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                ${headerLogoHtml}
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                <p style="margin-bottom: 6px;">&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
                <p style="margin: 0;">Support Hotline: ${contactPhone} &bull; <a href="mailto:${contactEmail}">${contactEmail}</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `.trim();
};

/**
 * Replaces all {{placeholder}} variables with live data values
 */
export const renderEmailTemplate = (
    template: EmailTemplate,
    data: Record<string, any>,
    settings?: Settings
): { subject: string; html: string } => {
    const appName = settings?.appName || 'RidersBUD';
    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ridersbud.com';
    const supportEmail = settings?.contactEmail || 'support@ridersbud.com';
    const supportPhone = settings?.contactPhone || '0917-123-4567';

    const mergedData: Record<string, any> = {
        appName,
        appUrl,
        supportEmail,
        supportPhone,
        ...data
    };

    let subject = template.subject;
    let body = template.body;

    Object.entries(mergedData).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const formattedValue = value !== undefined && value !== null ? String(value) : '';
        subject = subject.replace(regex, formattedValue);
        body = body.replace(regex, formattedValue);
    });

    const html = wrapInEmailLayout(body, settings, subject);

    return { subject, html };
};
