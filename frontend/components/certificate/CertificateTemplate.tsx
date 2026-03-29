"use client";

import React from 'react';
// Line 2: Removed unused 'Image' import to clear warning
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// 1. Define a strict interface for the data prop
interface CertificateData {
  id: string;
  contentHash: string;
  timestamp: string;
  txHash: string;
}

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottom: 2, borderBottomColor: '#2563eb', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e40af', marginBottom: 5 },
  watermark: { position: 'absolute', top: '40%', left: '20%', fontSize: 60, color: '#f1f5f9', transform: 'rotate(-45deg)', zIndex: -1 },
  section: { marginVertical: 10 },
  label: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 },
  value: { fontSize: 12, color: '#1e293b', marginBottom: 10 },
  footer: { marginTop: 40, fontSize: 10, color: '#94a3b8', textAlign: 'center', borderTop: 1, borderTopColor: '#e2e8f0', paddingTop: 20 },
});

// 2. Applied the interface to the component props (Line 20)
export const CertificateTemplate = ({ data }: { data: CertificateData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.watermark}>VERIFIED</Text>
      
      <View style={styles.header}>
        <Text style={styles.title}>StellarProof Provenance Certificate</Text>
        <Text style={{ fontSize: 10, color: '#64748b' }}>Secured by Stellar Network & Soroban Smart Contracts</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Certificate ID</Text>
        <Text style={styles.value}>{data.id}</Text>

        <Text style={styles.label}>Content Hash (SHA-256)</Text>
        <Text style={[styles.value, { fontFamily: 'Courier' }]}>{data.contentHash}</Text>

        <Text style={styles.label}>Timestamp</Text>
        <Text style={styles.value}>{new Date(data.timestamp).toLocaleString()}</Text>

        <Text style={styles.label}>Stellar Transaction Hash</Text>
        <Text style={[styles.value, { fontSize: 9 }]}>{data.txHash}</Text>
      </View>

      <View style={styles.footer}>
        <Text>This document serves as cryptographic proof of existence and ownership.</Text>
        <Text>Verify online at stellarproof.io/verify/{data.id}</Text>
      </View>
    </Page>
  </Document>
);