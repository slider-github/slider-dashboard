# Slider Dashboard

Multi-tenant dashboard platform for External ID authentication.

## Features

- **Multi-tenant support** - Works with multiple External ID tenants
- **4 Portal access** - NOTIFY, WHISPER, WOF, Admin Portal
- **Azure External ID integration** - JWT authentication
- **Responsive design** - Mobile-first approach
- **Accessibility** - WCAG 2.1 AA compliant
- **Slider brand design** - Complete design system integration

## Architecture

- **Frontend**: HTML + CSS + JavaScript (Vanilla)
- **Authentication**: Azure External ID (CIAM)
- **Hosting**: Azure Static Web Apps
- **DNS**: CloudFlare
- **Domain**: dashboard.slider.cloud

## Configuration

The dashboard is configured for External ID tenant:
- **Tenant ID**: `dd89df17-bd9e-45d5-a78e-947ff00f755e`
- **Domain**: `sliderexid.onmicrosoft.com`
- **App Registration**: `4839f7dd-535e-4b41-acd1-582129be660a`
- **User Flow**: `SliderMainFlow`

## Portal URLs

- NOTIFY: https://notify.slider.cloud
- WHISPER: https://whisper.slider.cloud  
- WOF: https://wof.slider.cloud
- Admin: https://admin.slider.cloud

## Deployment

Automatically deployed to Azure Static Web Apps on push to `main` branch.

**Live URL**: https://dashboard.slider.cloud