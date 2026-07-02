// src/pages/VendorRegistrationPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENDOR_SERVICE_CONFIGS } from '../context/data/vendorServiceConfig';

const API = 'http://localhost:5000/api';

export default function VendorRegistrationPage() {
  const navigate = useNavigate();
  
  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    location: 'Lucknow',
  });

  // Step 2: Service Selection
  const [selectedServices, setSelectedServices] = useState([]);
  const [primaryService, setPrimaryService] = useState('');

  // Step 3: Service-Specific Details
  const [serviceDetails, setServiceDetails] = useState({});

  // Form State
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleServiceToggle = (serviceId) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    
    // If this is the first service, set as primary
    if (!selectedServices.includes(serviceId) && selectedServices.length === 0) {
      setPrimaryService(serviceId);
    }
  };

  const handleServiceDetailChange = (serviceId, field, value) => {
    setServiceDetails(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        [field]: value,
      }
    }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      // Prepare payload
      const payload = {
        ...basicInfo,
        services_offered: selectedServices,
        primary_service: primaryService,
        service_details: serviceDetails,
      };

      const res = await fetch(`${API}/vendors/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/vendor/login'), 3000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      setError('Could not connect to server');
    }
    setLoading(false);
  };

  const getServiceConfig = (serviceId) => {
    return VENDOR_SERVICE_CONFIGS.find(s => s.id === serviceId);
  };

  const canProceed = () => {
    if (currentStep === 1) {
      return basicInfo.name && basicInfo.email && basicInfo.phone && basicInfo.password;
    }
    if (currentStep === 2) {
      return selectedServices.length > 0 && primaryService;
    }
    if (currentStep === 3) {
      // Validate each selected service has required fields
      return selectedServices.every(serviceId => {
        const config = getServiceConfig(serviceId);
        const details = serviceDetails[serviceId] || {};
        return details.specialty && details.price_per_day;
      });
    }
    return false;
  };

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ 
          background: 'white', 
          padding: '40px', 
          borderRadius: '16px', 
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
          <h2 style={{ color: '#1A1714', marginBottom: '8px' }}>Registration Successful!</h2>
          <p style={{ color: '#666' }}>Your application has been submitted for review. You will be notified once approved.</p>
          <p style={{ color: '#666', fontSize: '14px', marginTop: '16px' }}>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '16px', 
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '800px',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '30px',
          color: 'white'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>Vendor Registration</h1>
          <p style={{ margin: '8px 0 0', opacity: 0.9 }}>Join our platform and showcase your services</p>
          
          {/* Progress Steps */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
            {[1, 2, 3].map(step => (
              <div
                key={step}
                style={{
                  flex: 1,
                  height: '4px',
                  background: step <= currentStep ? 'white' : 'rgba(255,255,255,0.3)',
                  borderRadius: '2px',
                  transition: 'background 0.3s'
                }}
              />
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div style={{ padding: '40px' }}>
          {error && (
            <div style={{ 
              background: '#fee2e2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px', 
              padding: '12px 16px', 
              marginBottom: '20px', 
              color: '#dc2626',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div>
              <h2 style={{ color: '#1A1714', marginBottom: '24px' }}>Basic Information</h2>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={basicInfo.name}
                    onChange={e => setBasicInfo({ ...basicInfo, name: e.target.value })}
                    placeholder="e.g. Dream Wedding Photography"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={e => e.target.style.borderColor = '#667eea'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      value={basicInfo.email}
                      onChange={e => setBasicInfo({ ...basicInfo, email: e.target.value })}
                      placeholder="your@email.com"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={basicInfo.phone}
                      onChange={e => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    value={basicInfo.password}
                    onChange={e => setBasicInfo({ ...basicInfo, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={basicInfo.location}
                    onChange={e => setBasicInfo({ ...basicInfo, location: e.target.value })}
                    placeholder="e.g. Lucknow"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Service Selection */}
          {currentStep === 2 && (
            <div>
              <h2 style={{ color: '#1A1714', marginBottom: '8px' }}>Select Services You Provide</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>Choose all services you offer. Select your primary service.</p>

              <div style={{ display: 'grid', gap: '12px' }}>
                {VENDOR_SERVICE_CONFIGS.map(service => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceToggle(service.id)}
                    style={{
                      padding: '16px',
                      border: `2px solid ${selectedServices.includes(service.id) ? '#667eea' : '#e5e7eb'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: selectedServices.includes(service.id) ? '#f5f3ff' : 'white',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1A1714' }}>
                          {service.title}
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                          {service.navName}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {selectedServices.includes(service.id) && (
                          <span style={{
                            fontSize: '12px',
                            background: '#667eea',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontWeight: 500
                          }}>
                            {primaryService === service.id ? 'Primary' : 'Selected'}
                          </span>
                        )}
                        <div style={{
                          width: '24px',
                          height: '24px',
                          border: `2px solid ${selectedServices.includes(service.id) ? '#667eea' : '#d1d5db'}`,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: selectedServices.includes(service.id) ? '#667eea' : 'white'
                        }}>
                          {selectedServices.includes(service.id) && (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="white">
                              <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Primary Service Selection */}
                    {selectedServices.includes(service.id) && selectedServices.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrimaryService(service.id);
                        }}
                        style={{
                          marginTop: '12px',
                          padding: '8px 16px',
                          background: primaryService === service.id ? '#667eea' : '#e5e7eb',
                          color: primaryService === service.id ? 'white' : '#666',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        {primaryService === service.id ? '★ Primary Service' : 'Set as Primary'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Service-Specific Details */}
          {currentStep === 3 && (
            <div>
              <h2 style={{ color: '#1A1714', marginBottom: '8px' }}>Service Details</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>Provide details for each service you selected.</p>

              {selectedServices.map(serviceId => {
                const config = getServiceConfig(serviceId);
                const details = serviceDetails[serviceId] || {};

                return (
                  <div key={serviceId} style={{ marginBottom: '32px', paddingBottom: '32px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        background: '#f5f3ff', 
                        borderRadius: '8px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        {config.cardIcon}
                      </div>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: 600, color: '#1A1714' }}>
                          {config.title}
                        </div>
                        {primaryService === serviceId && (
                          <span style={{ fontSize: '12px', color: '#667eea', fontWeight: 500 }}>
                            Primary Service
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {config.admin.specialtyLabel} *
                        </label>
                        <input
                          type="text"
                          value={details.specialty || ''}
                          onChange={e => handleServiceDetailChange(serviceId, 'specialty', e.target.value)}
                          placeholder={config.admin.specialtyPlaceholder}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {config.admin.priceLabel} *
                        </label>
                        <input
                          type="number"
                          value={details.price_per_day || ''}
                          onChange={e => handleServiceDetailChange(serviceId, 'price_per_day', e.target.value)}
                          placeholder={config.admin.pricePlaceholder}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>

                      {/* Multi-tier pricing input */}
                      {config.pricingTiers && (
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Pricing Packages (Optional)
                          </label>
                          <div style={{ display: 'grid', gap: '12px' }}>
                            {config.pricingTiers.map(tier => (
                              <div key={tier.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                                    {tier.label}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <input
                                    type="number"
                                    value={details.pricingPackages?.[tier.id] || ''}
                                    onChange={e => {
                                      const packages = details.pricingPackages || {};
                                      handleServiceDetailChange(serviceId, 'pricingPackages', {
                                        ...packages,
                                        [tier.id]: e.target.value ? Number(e.target.value) : null
                                      });
                                    }}
                                    placeholder="Price"
                                    style={{
                                      width: '120px',
                                      padding: '8px 12px',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '6px',
                                      fontSize: '14px',
                                      outline: 'none'
                                    }}
                                  />
                                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                    {tier.unit}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Description
                        </label>
                        <textarea
                          value={details.description || ''}
                          onChange={e => handleServiceDetailChange(serviceId, 'description', e.target.value)}
                          placeholder="Tell us about your services, experience, and what makes you unique..."
                          rows={4}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none',
                            resize: 'vertical'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Tags (comma separated)
                        </label>
                        <input
                          type="text"
                          value={details.tags || ''}
                          onChange={e => handleServiceDetailChange(serviceId, 'tags', e.target.value)}
                          placeholder={config.admin.tagsPlaceholder}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              style={{
                padding: '12px 24px',
                background: currentStep === 1 ? '#f3f4f6' : '#e5e7eb',
                color: currentStep === 1 ? '#9ca3af' : '#374151',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ← Back
            </button>

            {currentStep < 3 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceed()}
                style={{
                  padding: '12px 24px',
                  background: canProceed() ? '#667eea' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: canProceed() ? 'pointer' : 'not-allowed'
                }}
              >
                Continue &rarr;
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || loading}
                style={{
                  padding: '12px 24px',
                  background: canProceed() && !loading ? '#667eea' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: canProceed() && !loading ? 'pointer' : 'not-allowed'
                }}
              >
                {loading ? 'Submitting...' : 'Submit Registration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
