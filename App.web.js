import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 8,
    minWidth: 160,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  secondaryButtonText: {
    color: '#667eea',
  },
  screen: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
  },
  appointmentsContainer: {
    width: '100%',
    marginVertical: 16,
  },
  appointmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  serviceType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  duration: {
    fontSize: 10,
    color: '#999',
    marginBottom: 10,
  },
  appointmentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  secondaryAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#667eea',
  },
  secondaryActionText: {
    color: '#667eea',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 16,
    width: '100%',
  },
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 20,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  scheduleContainer: {
    width: '100%',
    maxWidth: 600,
    marginVertical: 20,
  },
  timeSlot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  availabilityIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  availabilityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  calendarContainer: {
    width: '100%',
    marginVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  calendarDay: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  today: {
    backgroundColor: '#3498db',
    borderColor: '#2980b9',
  },
  selectedDay: {
    backgroundColor: '#27ae60',
    borderColor: '#229954',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  todayText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  timeRangesContainer: {
    width: '100%',
    marginVertical: 8,
  },
  timeRangeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rangeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  rangeTime: {
    fontSize: 12,
    color: '#666',
  },
  appointmentsList: {
    marginVertical: 8,
  },
  miniAppointment: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 8,
    marginVertical: 2,
    borderRadius: 6,
  },
  miniAppointmentTime: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    width: 50,
  },
  miniAppointmentClient: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  miniAppointmentService: {
    fontSize: 10,
    color: '#666',
    width: 60,
    textAlign: 'right',
  },
  noAppointments: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  addSlotButton: {
    backgroundColor: '#f0f4ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  addSlotText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  calendarToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggle: {
    backgroundColor: '#667eea',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeToggleText: {
    color: 'white',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
    paddingHorizontal: 20,
    backgroundColor: '#2c3e50',
    paddingVertical: 20,
    borderRadius: 8,
    borderBottomWidth: 3,
    borderBottomColor: '#34495e',
  },
  monthNavButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#bdc3c7',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  monthNavText: {
    fontSize: 22,
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ecf0f1',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  monthlyCalendarGrid: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    maxHeight: 500,
    borderWidth: 2,
    borderColor: '#34495e',
    overflow: 'hidden',
  },
  monthDayHeader: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#34495e',
    backgroundColor: '#34495e',
    borderRightWidth: 1,
    borderRightColor: '#bdc3c7',
  },
  monthDayHeaderText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ecf0f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  monthDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 0,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    backgroundColor: '#ffffff',
    minHeight: 60,
    paddingVertical: 8,
  },
  monthDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  otherMonthDay: {
    backgroundColor: '#f8f9fa',
  },
  otherMonthDayText: {
    color: '#95a5a6',
    fontWeight: 'normal',
  },
  calendarModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  monthlyCalendarList: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    maxHeight: 400,
  },
  listDayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
  },
  listToday: {
    backgroundColor: '#e3f2fd',
    borderLeftColor: '#667eea',
  },
  listSelected: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#4CAF50',
  },
  listDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listDayName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  listDayDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
  },
  listTodayText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  listSelectedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  listDayInfo: {
    alignItems: 'flex-end',
    flex: 1,
  },
  listDayAppointments: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  listDayTime: {
    fontSize: 10,
    color: '#999',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 16,
    width: '100%',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    width: '48%',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  chartContainer: {
    width: '100%',
    marginVertical: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 16,
  },
  chartBar: {
    width: 30,
    borderRadius: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
  },
  chartLabel: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  settingsContainer: {
    width: '100%',
    marginVertical: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    marginVertical: 3,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  settingArrow: {
    fontSize: 18,
    color: '#999',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos para calendario mensual tradicional
  monthlyCalendarContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginVertical: 8,
  },
  monthlyHeader: {
    backgroundColor: '#2c3e50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthlyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  monthlyNavButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthlyNavText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  monthlyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthlyDayHeader: {
    width: '14.28%',
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#34495e',
    borderBottomWidth: 1,
    borderBottomColor: '#bdc3c7',
    borderRightWidth: 1,
    borderRightColor: '#bdc3c7',
  },
  monthlyDayHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'white',
    textTransform: 'uppercase',
  },
  monthlyDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    backgroundColor: 'white',
    minHeight: 28,
  },
  monthlyDayText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2c3e50',
  },
  monthlyWeekendText: {
    color: '#e74c3c',
  },
  monthlyOtherMonthText: {
    color: '#95a5a6',
  },
  monthlyToday: {
    backgroundColor: '#3498db',
  },
  monthlyTodayText: {
    color: 'white',
    fontWeight: 'bold',
  },
  monthlySelected: {
    backgroundColor: '#27ae60',
  },
  monthlySelectedText: {
    color: 'white',
    fontWeight: 'bold',
  },
  selectedDayAppointmentsContainer: {
    width: '100%',
    marginVertical: 8,
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectedDayDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  noAppointmentsForDay: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 8,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    display: 'flex',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#3498db',
  },
  modalButtonSecondary: {
    backgroundColor: '#ecf0f1',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalButtonTextPrimary: {
    color: 'white',
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
    opacity: 0.6,
  },
  disabledButtonText: {
    color: '#999',
  },
  detailedStatsContainer: {
    marginTop: 20,
  },
  statsSection: {
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailedStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statInfo: {
    flex: 1,
  },
  detailedStatLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailedStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  trendText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  monthlySummary: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  profileForm: {
    flex: 1,
  },
  formSection: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#3498db',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  pickerArrow: {
    fontSize: 12,
    color: '#666',
  },
  pickerModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    maxWidth: 400,
    width: '90%',
    maxHeight: '80%',
    alignSelf: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    // Asegurar centrado en dispositivos móviles
    minHeight: 280,
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerContent: {
    maxHeight: 400,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  pickerOptionTextSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  pickerCheck: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    opacity: 0.6,
  },
  pickerButtonTextDisabled: {
    color: '#999',
  },
  pickerArrowDisabled: {
    color: '#999',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  clearSearchButton: {
    position: 'absolute',
    right: 24,
    top: 20,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

const BackButton = ({ onPress }) => (
  <TouchableOpacity style={styles.backButton} onPress={onPress}>
    <Text style={styles.backButtonText}>‹</Text>
  </TouchableOpacity>
);

const LoginScreen = ({ onNavigate }) => (
  <View style={styles.screen}>
    <Text style={styles.title}>Turnario</Text>
    <Text style={styles.subtitle}>
      Plataforma de gestión de turnos para profesionales independientes
    </Text>
    
    <TouchableOpacity style={styles.button} onPress={() => onNavigate('dashboard')}>
      <Text style={styles.buttonText}>Iniciar Sesión</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={[styles.button, styles.secondaryButton]} 
      onPress={() => onNavigate('register')}
    >
      <Text style={[styles.buttonText, styles.secondaryButtonText]}>Registrarse</Text>
    </TouchableOpacity>
    
    <Text style={{ marginTop: 30, fontSize: 12, color: '#999' }}>
      Versión web de demostración
    </Text>
  </View>
);

const RegisterScreen = ({ onNavigate }) => (
  <View style={styles.screen}>
    <BackButton onPress={() => onNavigate('login')} />
    <Text style={styles.title}>Registro</Text>
    <Text style={styles.subtitle}>
      Crea tu cuenta para comenzar a gestionar tus turnos
    </Text>
    
    <TouchableOpacity style={styles.button} onPress={() => onNavigate('dashboard')}>
      <Text style={styles.buttonText}>Registrarse</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={[styles.button, styles.secondaryButton]} 
      onPress={() => onNavigate('login')}
    >
      <Text style={[styles.buttonText, styles.secondaryButtonText]}>Volver al Login</Text>
    </TouchableOpacity>
  </View>
);

const DashboardScreen = ({ onNavigate }) => (
  <View style={styles.screen}>
    <Text style={styles.title}>Panel Profesional</Text>
    <Text style={styles.subtitle}>
      Gestiona tus citas y horarios desde aquí
    </Text>
    
    <View style={styles.menuGrid}>
      <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('appointments')}>
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>📅</Text>
        </View>
        <Text style={styles.menuTitle}>Citas del Día</Text>
        <Text style={styles.menuSubtitle}>Ver citas programadas</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('schedule')}>
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>⏰</Text>
        </View>
        <Text style={styles.menuTitle}>Panel de Turnos</Text>
        <Text style={styles.menuSubtitle}>Configurar horarios</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('reservations')}>
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>📋</Text>
        </View>
        <Text style={styles.menuTitle}>Reservas</Text>
        <Text style={styles.menuSubtitle}>Gestionar reservas</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('statistics')}>
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>📊</Text>
        </View>
        <Text style={styles.menuTitle}>Estadísticas</Text>
        <Text style={styles.menuSubtitle}>Ver métricas</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('settings')}>
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>⚙️</Text>
        </View>
        <Text style={styles.menuTitle}>Configuración</Text>
        <Text style={styles.menuSubtitle}>Ajustes del perfil</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.menuCard} onPress={() => onNavigate('login')}>
        <View style={styles.menuIcon}>
          <Text style={styles.iconText}>🚪</Text>
        </View>
        <Text style={styles.menuTitle}>Cerrar Sesión</Text>
        <Text style={styles.menuSubtitle}>Salir del sistema</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'confirmada':
      return '#4CAF50';
    case 'pendiente':
      return '#FF9800';
    case 'cancelada':
      return '#F44336';
    default:
      return '#666';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'confirmada':
      return 'Confirmada';
    case 'pendiente':
      return 'Pendiente';
    case 'cancelada':
      return 'Cancelada';
    default:
      return status;
  }
};

const AppointmentsScreen = ({ onNavigate }) => {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  
  // Datos de ejemplo para las citas del día
  const todayAppointments = [
    {
      id: 1,
      clientName: 'María González',
      time: '09:00',
      duration: '60 min',
      service: 'Consulta psicológica',
      status: 'confirmada'
    },
    {
      id: 2,
      clientName: 'Carlos Rodríguez',
      time: '11:30',
      duration: '45 min',
      service: 'Terapia ocupacional',
      status: 'pendiente'
    },
    {
      id: 3,
      clientName: 'Ana Martínez',
      time: '14:00',
      duration: '90 min',
      service: 'Sesión de coaching',
      status: 'confirmada'
    },
    {
      id: 4,
      clientName: 'Luis Pérez',
      time: '16:30',
      duration: '60 min',
      service: 'Consulta nutricional',
      status: 'cancelada'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmada':
        return '#4CAF50';
      case 'pendiente':
        return '#FF9800';
      case 'cancelada':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmada':
        return 'Confirmada';
      case 'pendiente':
        return 'Pendiente';
      case 'cancelada':
        return 'Cancelada';
      default:
        return status;
    }
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const closeAppointmentDetails = () => {
    setShowAppointmentDetails(false);
    setSelectedAppointment(null);
  };

  return (
    <View style={styles.screen}>
      <BackButton onPress={() => onNavigate('dashboard')} />
      <Text style={styles.title}>Citas del Día</Text>
      <Text style={styles.subtitle}>
        {new Date().toLocaleDateString('es-ES', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </Text>
      
             <View style={styles.appointmentsContainer}>
         {todayAppointments.map((appointment) => (
           <View key={appointment.id} style={styles.appointmentCard}>
             <View style={styles.appointmentHeader}>
               <Text style={styles.appointmentTime}>{appointment.time}</Text>
               <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                 <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
               </View>
             </View>
             
             <Text style={styles.clientName}>{appointment.clientName}</Text>
             <Text style={styles.serviceType}>{appointment.service}</Text>
             <Text style={styles.duration}>{appointment.duration}</Text>
             
             <View style={styles.appointmentActions}>
               <TouchableOpacity 
                 style={styles.actionButton}
                 onPress={() => handleViewDetails(appointment)}
               >
                 <Text style={styles.actionButtonText}>Ver Detalles</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]}>
                 <Text style={styles.secondaryActionText}>Iniciar Cita</Text>
               </TouchableOpacity>
             </View>
           </View>
         ))}
       </View>

      {/* Modal de Detalles de Cita */}
      {showAppointmentDetails && selectedAppointment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles de la Cita</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeAppointmentDetails}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cliente:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.clientName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fecha:</Text>
                <Text style={styles.detailValue}>
                  {new Date().toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hora:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.time}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duración:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.duration}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Servicio:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.service}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estado:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAppointment.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(selectedAppointment.status)}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]}>
                <Text style={styles.modalButtonText}>Editar Cita</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Iniciar Cita</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const ScheduleScreen = ({ onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonthlyCalendar, setShowMonthlyCalendar] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  
  // Generar días de la semana actual
  const getWeekDays = () => {
    const today = new Date();
    const days = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + i);
      days.push({
        name: dayNames[date.getDay()],
        date: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        isSelected: i === 0 // Por defecto seleccionar hoy
      });
    }
    return days;
  };

  // Generar calendario mensual
  const getMonthlyCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    
    // Generar 6 semanas completas (42 días)
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // Domingo o Sábado
      
      days.push({
        date: date.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        isWeekend,
        fullDate: date
      });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const monthlyDays = getMonthlyCalendar();
  
  // Inicializar citas del día seleccionado
  React.useEffect(() => {
    const appointments = getAppointmentsForDate(selectedDate);
    setSelectedDayAppointments(appointments);
  }, []);
  
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Datos de ejemplo de citas
  const allAppointments = [
    {
      id: 1,
      clientName: 'María González',
      date: '2024-01-15',
      time: '09:00',
      duration: '60 min',
      service: 'Consulta psicológica',
      status: 'confirmada'
    },
    {
      id: 2,
      clientName: 'Carlos Rodríguez',
      date: '2024-01-15',
      time: '11:30',
      duration: '45 min',
      service: 'Terapia ocupacional',
      status: 'pendiente'
    },
    {
      id: 3,
      clientName: 'Ana Martínez',
      date: '2024-01-16',
      time: '14:00',
      duration: '90 min',
      service: 'Sesión de coaching',
      status: 'confirmada'
    },
    {
      id: 4,
      clientName: 'Luis Pérez',
      date: '2024-01-16',
      time: '16:30',
      duration: '60 min',
      service: 'Consulta nutricional',
      status: 'cancelada'
    },
    {
      id: 5,
      clientName: 'Sofia López',
      date: '2024-01-17',
      time: '10:00',
      duration: '45 min',
      service: 'Terapia física',
      status: 'confirmada'
    },
    {
      id: 6,
      clientName: 'Roberto Silva',
      date: '2024-01-17',
      time: '15:30',
      duration: '60 min',
      service: 'Consulta médica',
      status: 'pendiente'
    }
  ];

  // Función para obtener citas del día seleccionado
  const getAppointmentsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return allAppointments.filter(appointment => appointment.date === dateString);
  };

  // Función para manejar la selección de fecha
  const handleDateSelection = (date) => {
    setSelectedDate(date);
    const appointments = getAppointmentsForDate(date);
    setSelectedDayAppointments(appointments);
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  const closeAppointmentDetails = () => {
    setShowAppointmentDetails(false);
    setSelectedAppointment(null);
  };



  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
    // Actualizar citas cuando se cambia de mes
    const appointments = getAppointmentsForDate(newDate);
    setSelectedDayAppointments(appointments);
  };
  
  const timeRanges = [
    { start: '08:00', end: '12:00', label: 'Mañana', appointments: [
      { time: '09:00', client: 'María González', service: 'Consulta' },
      { time: '10:30', client: 'Carlos Rodríguez', service: 'Terapia' }
    ]},
    { start: '14:00', end: '18:00', label: 'Tarde', appointments: [
      { time: '15:00', client: 'Ana Martínez', service: 'Coaching' },
      { time: '16:30', client: 'Luis Pérez', service: 'Nutrición' }
    ]},
    { start: '19:00', end: '21:00', label: 'Noche', appointments: []}
  ];



    return (
    <View style={styles.screen}>
      <BackButton onPress={() => onNavigate('dashboard')} />
      <Text style={styles.title}>Panel de Turnos</Text>
      <Text style={styles.subtitle}>
        Gestiona tu calendario y horarios
      </Text>
      
      {/* Selector de vista de calendario */}
      <View style={styles.calendarToggle}>
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            !showMonthlyCalendar && styles.activeToggle
          ]}
          onPress={() => setShowMonthlyCalendar(false)}
        >
          <Text style={[
            styles.toggleText,
            !showMonthlyCalendar && styles.activeToggleText
          ]}>Semana</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            showMonthlyCalendar && styles.activeToggle
          ]}
          onPress={() => setShowMonthlyCalendar(true)}
        >
          <Text style={[
            styles.toggleText,
            showMonthlyCalendar && styles.activeToggleText
          ]}>Mes</Text>
        </TouchableOpacity>
      </View>
      
      {!showMonthlyCalendar ? (
        /* Calendario Semanal */
        <View style={styles.calendarContainer}>
          <Text style={styles.sectionTitle}>Esta Semana</Text>
          <View style={styles.calendarGrid}>
                         {weekDays.map((day, index) => {
               const dayDate = new Date();
               dayDate.setDate(dayDate.getDate() - dayDate.getDay() + index);
               const isSelected = dayDate.toDateString() === selectedDate.toDateString();
               
               return (
                 <TouchableOpacity 
                   key={index} 
                   style={[
                     styles.calendarDay,
                     day.isToday && styles.today,
                     isSelected && styles.selectedDay
                   ]}
                   onPress={() => handleDateSelection(dayDate)}
                 >
                                 <Text style={[
                   styles.dayName,
                   day.isToday && styles.todayText,
                   isSelected && styles.selectedDayText
                 ]}>
                   {day.name}
                 </Text>
                 <Text style={[
                   styles.dayDate,
                   day.isToday && styles.todayText,
                   isSelected && styles.selectedDayText
                 ]}>
                   {day.date}
                 </Text>
               </TouchableOpacity>
               );
             })}
          </View>
        </View>
      ) : (
        /* Calendario Mensual Tradicional */
        <View style={styles.monthlyCalendarContainer}>
          <View style={styles.monthlyHeader}>
            <TouchableOpacity style={styles.monthlyNavButton} onPress={() => navigateMonth(-1)}>
              <Text style={styles.monthlyNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthlyTitle}>
              {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </Text>
            <TouchableOpacity style={styles.monthlyNavButton} onPress={() => navigateMonth(1)}>
              <Text style={styles.monthlyNavText}>›</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.monthlyGrid}>
            {/* Días de la semana */}
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, index) => (
              <View key={index} style={styles.monthlyDayHeader}>
                <Text style={styles.monthlyDayHeaderText}>{dayName.slice(0, 3)}</Text>
              </View>
            ))}
            
            {/* Días del mes */}
            {monthlyDays.map((day, index) => (
              <TouchableOpacity 
                key={index} 
                style={[
                  styles.monthlyDay,
                  day.isToday && styles.monthlyToday,
                  day.isSelected && styles.monthlySelected
                ]}
                onPress={() => setSelectedDate(day.fullDate)}
              >
                <Text style={[
                  styles.monthlyDayText,
                  !day.isCurrentMonth && styles.monthlyOtherMonthText,
                  day.isWeekend && styles.monthlyWeekendText,
                  day.isToday && styles.monthlyTodayText,
                  day.isSelected && styles.monthlySelectedText
                ]}>
                  {day.date}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
                 </View>
       )}
       
       {/* Citas del Día Seleccionado */}
       <View style={styles.selectedDayAppointmentsContainer}>
         <Text style={styles.selectedDayTitle}>Citas del Día</Text>
         <Text style={styles.selectedDayDate}>
           {selectedDate.toLocaleDateString('es-ES', { 
             weekday: 'long', 
             year: 'numeric', 
             month: 'long', 
             day: 'numeric' 
           })}
         </Text>
         
         {selectedDayAppointments.length > 0 ? (
           <View style={styles.appointmentsContainer}>
             {selectedDayAppointments.map((appointment) => (
               <View key={appointment.id} style={styles.appointmentCard}>
                 <View style={styles.appointmentHeader}>
                   <Text style={styles.appointmentTime}>{appointment.time}</Text>
                   <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) }]}>
                     <Text style={styles.statusText}>{getStatusText(appointment.status)}</Text>
                   </View>
                 </View>
                 
                 <Text style={styles.clientName}>{appointment.clientName}</Text>
                 <Text style={styles.serviceType}>{appointment.service}</Text>
                 <Text style={styles.duration}>{appointment.duration}</Text>
                 
                 <View style={styles.appointmentActions}>
                   <TouchableOpacity 
                     style={styles.actionButton}
                     onPress={() => handleViewDetails(appointment)}
                   >
                     <Text style={styles.actionButtonText}>Ver Detalles</Text>
                   </TouchableOpacity>
                   <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]}>
                     <Text style={styles.secondaryActionText}>Iniciar Cita</Text>
                   </TouchableOpacity>
                 </View>
               </View>
             ))}
           </View>
         ) : (
           <Text style={styles.noAppointmentsForDay}>
             No hay citas programadas para este día
           </Text>
         )}
       </View>
       
       {/* Rangos de Horarios */}
      <View style={styles.timeRangesContainer}>
        <Text style={styles.sectionTitle}>Horarios Disponibles</Text>
        {timeRanges.map((range, index) => (
          <View key={index} style={styles.timeRangeCard}>
            <View style={styles.rangeHeader}>
              <Text style={styles.rangeLabel}>{range.label}</Text>
              <Text style={styles.rangeTime}>{range.start} - {range.end}</Text>
            </View>
            
            {range.appointments.length > 0 ? (
              <View style={styles.appointmentsList}>
                {range.appointments.map((appointment, appIndex) => (
                  <View key={appIndex} style={styles.miniAppointment}>
                    <Text style={styles.miniAppointmentTime}>{appointment.time}</Text>
                    <Text style={styles.miniAppointmentClient}>{appointment.client}</Text>
                    <Text style={styles.miniAppointmentService}>{appointment.service}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noAppointments}>Sin citas programadas</Text>
            )}
            
            <TouchableOpacity style={styles.addSlotButton}>
              <Text style={styles.addSlotText}>+ Agregar Horario</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Modal de Detalles de Cita */}
      {showAppointmentDetails && selectedAppointment && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalles de la Cita</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeAppointmentDetails}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cliente:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.clientName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Fecha:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedAppointment.date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hora:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.time}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duración:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.duration}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Servicio:</Text>
                <Text style={styles.detailValue}>{selectedAppointment.service}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estado:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedAppointment.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(selectedAppointment.status)}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonSecondary]}>
                <Text style={styles.modalButtonText}>Editar Cita</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonPrimary]}>
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Iniciar Cita</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const ReservationsScreen = ({ onNavigate }) => {
  const [reservations, setReservations] = useState([
    {
      id: 1,
      clientName: 'María González',
      date: '2024-01-15',
      time: '09:00',
      service: 'Consulta psicológica',
      status: 'pendiente'
    },
    {
      id: 2,
      clientName: 'Carlos Rodríguez',
      date: '2024-01-16',
      time: '11:30',
      service: 'Terapia ocupacional',
      status: 'confirmada'
    },
    {
      id: 3,
      clientName: 'Ana Martínez',
      date: '2024-01-17',
      time: '14:00',
      service: 'Sesión de coaching',
      status: 'cancelada'
    }
  ]);

  const handleAcceptReservation = (reservationId) => {
    setReservations(prevReservations => 
      prevReservations.map(reservation => 
        reservation.id === reservationId && reservation.status === 'pendiente'
          ? { ...reservation, status: 'confirmada' }
          : reservation
      )
    );
  };

  const handleRejectReservation = (reservationId) => {
    setReservations(prevReservations => 
      prevReservations.map(reservation => 
        reservation.id === reservationId && reservation.status === 'pendiente'
          ? { ...reservation, status: 'cancelada' }
          : reservation
      )
    );
  };

  return (
    <View style={styles.screen}>
      <BackButton onPress={() => onNavigate('dashboard')} />
      <Text style={styles.title}>Reservas</Text>
      <Text style={styles.subtitle}>
        Gestiona todas las reservas de tus clientes
      </Text>
      
      <View style={styles.appointmentsContainer}>
        {reservations.map((reservation) => (
          <View key={reservation.id} style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
              <Text style={styles.appointmentTime}>{reservation.time}</Text>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(reservation.status) }
              ]}>
                <Text style={styles.statusText}>{getStatusText(reservation.status)}</Text>
              </View>
            </View>
            
            <Text style={styles.clientName}>{reservation.clientName}</Text>
            <Text style={styles.serviceType}>{reservation.service}</Text>
            <Text style={styles.duration}>Fecha: {reservation.date}</Text>
            
                         <View style={styles.appointmentActions}>
               <TouchableOpacity 
                 style={[
                   styles.actionButton,
                   reservation.status !== 'pendiente' && styles.disabledButton
                 ]}
                 onPress={() => handleAcceptReservation(reservation.id)}
                 disabled={reservation.status !== 'pendiente'}
               >
                 <Text style={[
                   styles.actionButtonText,
                   reservation.status !== 'pendiente' && styles.disabledButtonText
                 ]}>
                   {reservation.status === 'confirmada' ? 'Confirmada' : 'Aceptar'}
                 </Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={[
                   styles.actionButton, 
                   styles.secondaryAction,
                   reservation.status !== 'pendiente' && styles.disabledButton
                 ]}
                 onPress={() => handleRejectReservation(reservation.id)}
                 disabled={reservation.status !== 'pendiente'}
               >
                 <Text style={[
                   styles.secondaryActionText,
                   reservation.status !== 'pendiente' && styles.disabledButtonText
                 ]}>
                   {reservation.status === 'cancelada' ? 'Cancelada' : 'Rechazar'}
                 </Text>
               </TouchableOpacity>
             </View>
           </View>
         ))}
       </View>
    </View>
  );
};

const StatisticsScreen = ({ onNavigate }) => {
  const stats = [
    { label: 'Citas Hoy', value: '4', color: '#4CAF50' },
    { label: 'Citas Semana', value: '12', color: '#2196F3' },
    { label: 'Ingresos Mes', value: '$2,450', color: '#FF9800' },
    { label: 'Clientes Nuevos', value: '8', color: '#9C27B0' },
    { label: 'Tasa de Confirmación', value: '85%', color: '#00BCD4' },
    { label: 'Tiempo Promedio', value: '45 min', color: '#E91E63' },
    { label: 'Reservas Pendientes', value: '3', color: '#FF5722' },
    { label: 'Satisfacción', value: '4.8★', color: '#FFC107' }
  ];

  const detailedStats = [
    { category: 'Rendimiento', items: [
      { label: 'Citas Completadas', value: '156', trend: '+12%' },
      { label: 'Tiempo Promedio', value: '45 min', trend: '-5%' },
      { label: 'Tasa de Asistencia', value: '92%', trend: '+3%' }
    ]},
    { category: 'Financiero', items: [
      { label: 'Ingresos Totales', value: '$8,750', trend: '+18%' },
      { label: 'Ingresos Promedio', value: '$56', trend: '+8%' },
      { label: 'Meta Mensual', value: '75%', trend: '+15%' }
    ]},
    { category: 'Clientes', items: [
      { label: 'Clientes Activos', value: '45', trend: '+5' },
      { label: 'Clientes Recurrentes', value: '32', trend: '+8' },
      { label: 'Nuevos Clientes', value: '13', trend: '+3' }
    ]}
  ];

  return (
    <View style={styles.screen}>
      <BackButton onPress={() => onNavigate('dashboard')} />
      <Text style={styles.title}>Estadísticas</Text>
      <Text style={styles.subtitle}>
        Métricas de tu actividad profesional
      </Text>
      
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Actividad de la Semana</Text>
        <View style={styles.chart}>
          <View style={[styles.chartBar, { height: 60, backgroundColor: '#4CAF50' }]}>
            <Text style={styles.chartLabel}>Lun</Text>
          </View>
          <View style={[styles.chartBar, { height: 80, backgroundColor: '#2196F3' }]}>
            <Text style={styles.chartLabel}>Mar</Text>
          </View>
          <View style={[styles.chartBar, { height: 45, backgroundColor: '#FF9800' }]}>
            <Text style={styles.chartLabel}>Mié</Text>
          </View>
          <View style={[styles.chartBar, { height: 90, backgroundColor: '#9C27B0' }]}>
            <Text style={styles.chartLabel}>Jue</Text>
          </View>
          <View style={[styles.chartBar, { height: 70, backgroundColor: '#4CAF50' }]}>
            <Text style={styles.chartLabel}>Vie</Text>
          </View>
        </View>
      </View>

      {/* Estadísticas Detalladas */}
      <View style={styles.detailedStatsContainer}>
        {detailedStats.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.statsSection}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            {section.items.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.detailedStatRow}>
                <View style={styles.statInfo}>
                  <Text style={styles.detailedStatLabel}>{item.label}</Text>
                  <Text style={styles.detailedStatValue}>{item.value}</Text>
                </View>
                <View style={[
                  styles.trendBadge,
                  { backgroundColor: item.trend.startsWith('+') ? '#4CAF50' : '#F44336' }
                ]}>
                  <Text style={styles.trendText}>{item.trend}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Resumen Mensual */}
      <View style={styles.monthlySummary}>
        <Text style={styles.sectionTitle}>Resumen Mensual</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>156</Text>
            <Text style={styles.summaryLabel}>Citas Totales</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>$8,750</Text>
            <Text style={styles.summaryLabel}>Ingresos</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>92%</Text>
            <Text style={styles.summaryLabel}>Satisfacción</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>45</Text>
            <Text style={styles.summaryLabel}>Clientes</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const PersonalProfileForm = ({ profileData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: profileData.name || '',
    email: profileData.email || '',
    phone: profileData.phone || '',
    location: profileData.location || ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <View style={styles.profileForm}>
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Información Personal</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nombre Completo</Text>
          <TextInput
            style={styles.textInput}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Tu nombre completo"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="tu@email.com"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Teléfono</Text>
          <TextInput
            style={styles.textInput}
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            placeholder="+54 11 1234-5678"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Ubicación</Text>
          <TextInput
            style={styles.textInput}
            value={formData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            placeholder="Ciudad, País"
          />
        </View>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity 
          style={[styles.formButton, styles.cancelButton]} 
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.formButton, styles.saveButton]} 
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const ProfileForm = ({ profileData, onSave, onCancel }) => {
  const [formData, setFormData] = useState(profileData);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [showProfessionPicker, setShowProfessionPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [professionSearchQuery, setProfessionSearchQuery] = useState('');

  const professions = [
    'Psicólogo/a',
    'Psiquiatra',
    'Terapeuta',
    'Counselor',
    'Coach',
    'Neuropsicólogo/a',
    'Psicopedagogo/a',
    'Psicólogo/a Forense',
    'Psicólogo/a Organizacional',
    'Psicólogo/a Deportivo',
    'Psicólogo/a Clínico',
    'Psicólogo/a Infantil',
    'Psicólogo/a Familiar',
    'Psicólogo/a de la Salud',
    'Psicólogo/a Social',
    'Psicólogo/a Educativo',
    'Psicólogo/a Comunitario',
    'Psicólogo/a Militar',
    'Psicólogo/a del Tráfico',
    'Psicólogo/a de la Adicción',
    'Psicólogo/a de la Violencia',
    'Psicólogo/a de la Sexualidad',
    'Psicólogo/a de la Religión',
    'Psicólogo/a de la Creatividad',
    'Psicólogo/a de las Artes',
    'Psicólogo/a de la Comunicación',
    'Psicólogo/a de la Publicidad',
    'Psicólogo/a del Consumo',
    'Psicólogo/a de la Moda',
    'Psicólogo/a del Turismo',
    'Psicólogo/a de la Alimentación',
    'Psicólogo/a del Ejercicio',
    'Psicólogo/a del Sueño',
    'Psicólogo/a del Dolor',
    'Psicólogo/a de la Maternidad',
    'Psicólogo/a de la Paternidad',
    'Psicólogo/a del Duelo',
    'Psicólogo/a de la Resiliencia',
    'Psicólogo/a de la Felicidad',
    'Psicólogo/a del Bienestar',
    'Psicólogo/a de la Espiritualidad',
    'Psicólogo/a de la Consciencia',
    'Psicólogo/a de la Meditación',
    'Psicólogo/a de la Hipnosis',
    'Psicólogo/a de la Biofeedback',
    'Psicólogo/a de la Neurociencia',
    'Psicólogo/a de la Genética',
    'Psicólogo/a de la Evolución',
    'Psicólogo/a de la Antropología',
    'Psicólogo/a de la Sociología',
    'Psicólogo/a de la Filosofía',
    'Psicólogo/a de la Historia',
    'Psicólogo/a de la Política',
    'Psicólogo/a de la Economía',
    'Psicólogo/a de la Tecnología',
    'Psicólogo/a Digital',
    'Psicólogo/a de las Redes Sociales',
    'Psicólogo/a de la Ciberseguridad',
    'Psicólogo/a de la Inteligencia Artificial',
    'Psicólogo/a de la Realidad Virtual',
    'Psicólogo/a de la Gamificación',
    'Psicólogo/a del Aprendizaje Online',
    'Psicólogo/a de la Educación Especial',
    'Psicólogo/a de la Superdotación',
    'Psicólogo/a de las Altas Capacidades',
    'Psicólogo/a de la Diversidad',
    'Psicólogo/a de la Inclusión',
    'Psicólogo/a de la Interculturalidad',
    'Psicólogo/a de la Migración',
    'Psicólogo/a de los Refugiados',
    'Psicólogo/a de la Pobreza',
    'Psicólogo/a de la Desigualdad',
    'Psicólogo/a de la Justicia Social',
    'Psicólogo/a de la Paz',
    'Psicólogo/a del Conflicto',
    'Psicólogo/a de la Negociación',
    'Psicólogo/a de la Mediación',
    'Psicólogo/a de la Arbitraje',
    'Psicólogo/a de la Conciliación',
    'Psicólogo/a de la Reconciliación',
    'Psicólogo/a de la Perdón',
    'Psicólogo/a de la Compasión',
    'Psicólogo/a de la Empatía',
    'Psicólogo/a de la Asertividad',
    'Psicólogo/a de la Inteligencia Emocional',
    'Psicólogo/a de la Regulación Emocional',
    'Psicólogo/a de la Autoconsciencia',
    'Psicólogo/a de la Autogestión',
    'Psicólogo/a de la Motivación Intrínseca',
    'Psicólogo/a de la Motivación Extrínseca',
    'Psicólogo/a de la Autodeterminación',
    'Psicólogo/a de la Autonomía',
    'Psicólogo/a de la Competencia',
    'Psicólogo/a de la Relación',
    'Psicólogo/a de la Conexión',
    'Psicólogo/a de la Pertenencia',
    'Psicólogo/a de la Identidad',
    'Psicólogo/a del Autoconcepto',
    'Psicólogo/a de la Autoestima',
    'Psicólogo/a de la Autoconfianza',
    'Psicólogo/a de la Autoevaluación',
    'Psicólogo/a de la Autocrítica',
    'Psicólogo/a de la Autocompasión',
    'Psicólogo/a de la Autocuidado',
    'Psicólogo/a del Autodesarrollo',
    'Psicólogo/a de la Autorealización',
    'Psicólogo/a de la Autotranscendencia'
  ];

  const specialties = [
    'Psicología Clínica',
    'Psicología Infantil',
    'Psicología Organizacional',
    'Psicología Educativa',
    'Psicología Forense',
    'Psicología Deportiva',
    'Psicología de la Salud',
    'Psicología Social',
    'Psicología Cognitiva',
    'Psicología Conductual',
    'Psicología Humanista',
    'Psicología Transpersonal',
    'Psicología Comunitaria',
    'Psicología Ambiental',
    'Psicología Positiva',
    'Psicología Evolutiva',
    'Psicología Experimental',
    'Psicología de la Personalidad',
    'Psicología del Desarrollo',
    'Psicología de la Motivación',
    'Psicología del Trabajo',
    'Psicología Industrial',
    'Psicología Militar',
    'Psicología del Tráfico',
    'Psicología de la Familia',
    'Psicología de Pareja',
    'Psicología del Envejecimiento',
    'Psicología de la Discapacidad',
    'Psicología de la Adicción',
    'Psicología de la Violencia',
    'Psicología de la Sexualidad',
    'Psicología de la Religión',
    'Psicología de la Creatividad',
    'Psicología de la Música',
    'Psicología del Arte',
    'Psicología de la Literatura',
    'Psicología de la Comunicación',
    'Psicología de la Publicidad',
    'Psicología del Consumo',
    'Psicología de la Moda',
    'Psicología del Turismo',
    'Psicología de la Alimentación',
    'Psicología del Ejercicio',
    'Psicología del Sueño',
    'Psicología del Dolor',
    'Psicología de la Maternidad',
    'Psicología de la Paternidad',
    'Psicología del Duelo',
    'Psicología de la Resiliencia',
    'Psicología de la Felicidad',
    'Psicología del Bienestar',
    'Psicología de la Espiritualidad',
    'Psicología de la Consciencia',
    'Psicología de la Meditación',
    'Psicología de la Hipnosis',
    'Psicología de la Biofeedback',
    'Psicología de la Neurociencia',
    'Psicología de la Genética',
    'Psicología de la Evolución',
    'Psicología de la Antropología',
    'Psicología de la Sociología',
    'Psicología de la Filosofía',
    'Psicología de la Historia',
    'Psicología de la Política',
    'Psicología de la Economía',
    'Psicología de la Tecnología',
    'Psicología Digital',
    'Psicología de las Redes Sociales',
    'Psicología de la Ciberseguridad',
    'Psicología de la Inteligencia Artificial',
    'Psicología de la Realidad Virtual',
    'Psicología de la Gamificación',
    'Psicología del Aprendizaje Online',
    'Psicología de la Educación Especial',
    'Psicología de la Superdotación',
    'Psicología de las Altas Capacidades',
    'Psicología de la Diversidad',
    'Psicología de la Inclusión',
    'Psicología de la Interculturalidad',
    'Psicología de la Migración',
    'Psicología de los Refugiados',
    'Psicología de la Pobreza',
    'Psicología de la Desigualdad',
    'Psicología de la Justicia Social',
    'Psicología de la Paz',
    'Psicología del Conflicto',
    'Psicología de la Negociación',
    'Psicología de la Mediación',
    'Psicología de la Arbitraje',
    'Psicología de la Conciliación',
    'Psicología de la Reconciliación',
    'Psicología de la Perdón',
    'Psicología de la Compasión',
    'Psicología de la Empatía',
    'Psicología de la Asertividad',
    'Psicología de la Inteligencia Emocional',
    'Psicología de la Regulación Emocional',
    'Psicología de la Autoconsciencia',
    'Psicología de la Autogestión',
    'Psicología de la Motivación Intrínseca',
    'Psicología de la Motivación Extrínseca',
    'Psicología de la Autodeterminación',
    'Psicología de la Autonomía',
    'Psicología de la Competencia',
    'Psicología de la Relación',
    'Psicología de la Conexión',
    'Psicología de la Pertenencia',
    'Psicología de la Identidad',
    'Psicología del Autoconcepto',
    'Psicología de la Autoestima',
    'Psicología de la Autoconfianza',
    'Psicología de la Autoevaluación',
    'Psicología de la Autocrítica',
    'Psicología de la Autocompasión',
    'Psicología de la Autocuidado',
    'Psicología del Autodesarrollo',
    'Psicología de la Autorealización',
    'Psicología de la Autotranscendencia'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleSpecialtySelect = (specialty) => {
    handleInputChange('specialty', specialty);
    setShowSpecialtyPicker(false);
    setSearchQuery(''); // Limpiar búsqueda al seleccionar
  };

  const handleProfessionSelect = (profession) => {
    handleInputChange('profession', profession);
    // Limpiar especialidad si no es compatible con la nueva profesión
    if (formData.specialty) {
      const isCompatible = filteredSpecialties.some(specialty => 
        specialty === formData.specialty
      );
      if (!isCompatible) {
        handleInputChange('specialty', '');
      }
    }
    setShowProfessionPicker(false);
    setProfessionSearchQuery(''); // Limpiar búsqueda al seleccionar
  };

  // Filtrar profesiones según la búsqueda
  const filteredProfessions = professions.filter(profession =>
    profession.toLowerCase().includes(professionSearchQuery.toLowerCase())
  );

  // Filtrar especialidades según la búsqueda y la profesión seleccionada
  const filteredSpecialties = specialties.filter(specialty => {
    const matchesSearch = specialty.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Si no hay profesión seleccionada, mostrar todas las especialidades
    if (!formData.profession) return matchesSearch;
    
    // Filtrar especialidades según la profesión seleccionada
    const professionLower = formData.profession.toLowerCase();
    const specialtyLower = specialty.toLowerCase();
    
    // Lógica de filtrado por profesión
    if (professionLower.includes('clínico') || professionLower.includes('clínica')) {
      return matchesSearch && (specialtyLower.includes('clínica') || specialtyLower.includes('terapia'));
    } else if (professionLower.includes('infantil')) {
      return matchesSearch && (specialtyLower.includes('infantil') || specialtyLower.includes('desarrollo') || specialtyLower.includes('educativa'));
    } else if (professionLower.includes('organizacional')) {
      return matchesSearch && (specialtyLower.includes('organizacional') || specialtyLower.includes('trabajo') || specialtyLower.includes('industrial'));
    } else if (professionLower.includes('deportivo')) {
      return matchesSearch && (specialtyLower.includes('deportiva') || specialtyLower.includes('ejercicio'));
    } else if (professionLower.includes('forense')) {
      return matchesSearch && (specialtyLower.includes('forense') || specialtyLower.includes('violencia') || specialtyLower.includes('conflicto'));
    } else if (professionLower.includes('salud')) {
      return matchesSearch && (specialtyLower.includes('salud') || specialtyLower.includes('médica') || specialtyLower.includes('dolor'));
    } else if (professionLower.includes('social')) {
      return matchesSearch && (specialtyLower.includes('social') || specialtyLower.includes('comunitaria') || specialtyLower.includes('diversidad'));
    } else if (professionLower.includes('educativo')) {
      return matchesSearch && (specialtyLower.includes('educativa') || specialtyLower.includes('aprendizaje') || specialtyLower.includes('pedagógica'));
    } else if (professionLower.includes('digital')) {
      return matchesSearch && (specialtyLower.includes('digital') || specialtyLower.includes('tecnología') || specialtyLower.includes('redes'));
    } else if (professionLower.includes('militar')) {
      return matchesSearch && (specialtyLower.includes('militar') || specialtyLower.includes('trauma') || specialtyLower.includes('estrés'));
    } else if (professionLower.includes('familiar')) {
      return matchesSearch && (specialtyLower.includes('familiar') || specialtyLower.includes('pareja') || specialtyLower.includes('maternidad'));
    } else if (professionLower.includes('neuropsicólogo')) {
      return matchesSearch && (specialtyLower.includes('neurociencia') || specialtyLower.includes('cognitiva') || specialtyLower.includes('cerebral'));
    } else if (professionLower.includes('psicopedagogo')) {
      return matchesSearch && (specialtyLower.includes('educativa') || specialtyLower.includes('aprendizaje') || specialtyLower.includes('desarrollo'));
    } else if (professionLower.includes('coach')) {
      return matchesSearch && (specialtyLower.includes('motivación') || specialtyLower.includes('desarrollo') || specialtyLower.includes('bienestar'));
    } else if (professionLower.includes('counselor')) {
      return matchesSearch && (specialtyLower.includes('orientación') || specialtyLower.includes('apoyo') || specialtyLower.includes('acompañamiento'));
    } else if (professionLower.includes('terapeuta')) {
      return matchesSearch && (specialtyLower.includes('terapia') || specialtyLower.includes('clínica') || specialtyLower.includes('tratamiento'));
    } else if (professionLower.includes('psiquiatra')) {
      return matchesSearch && (specialtyLower.includes('clínica') || specialtyLower.includes('médica') || specialtyLower.includes('trastorno'));
    }
    
    // Si no hay coincidencia específica, mostrar todas las especialidades
    return matchesSearch;
  });

  return (
    <View style={styles.profileForm}>
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Información Personal</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nombre Completo</Text>
          <TextInput
            style={styles.textInput}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            placeholder="Tu nombre completo"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.textInput}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="tu@email.com"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Teléfono</Text>
          <TextInput
            style={styles.textInput}
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            placeholder="+54 11 1234-5678"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Ubicación</Text>
          <TextInput
            style={styles.textInput}
            value={formData.location}
            onChangeText={(value) => handleInputChange('location', value)}
            placeholder="Ciudad, País"
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Información Profesional</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Profesión</Text>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => setShowProfessionPicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              {formData.profession || 'Seleccionar profesión'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Especialidad</Text>
          <TouchableOpacity 
            style={[
              styles.pickerButton,
              !formData.profession && styles.pickerButtonDisabled
            ]}
            onPress={() => formData.profession && setShowSpecialtyPicker(true)}
            disabled={!formData.profession}
          >
            <Text style={[
              styles.pickerButtonText,
              !formData.profession && styles.pickerButtonTextDisabled
            ]}>
              {formData.specialty || (formData.profession ? 'Seleccionar especialidad' : 'Primero selecciona una profesión')}
            </Text>
            <Text style={[
              styles.pickerArrow,
              !formData.profession && styles.pickerArrowDisabled
            ]}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Años de Experiencia</Text>
          <TextInput
            style={styles.textInput}
            value={formData.experience}
            onChangeText={(value) => handleInputChange('experience', value)}
            placeholder="Ej: 8 años"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Educación</Text>
          <TextInput
            style={styles.textInput}
            value={formData.education}
            onChangeText={(value) => handleInputChange('education', value)}
            placeholder="Título y universidad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tarifa por Hora</Text>
          <TextInput
            style={styles.textInput}
            value={formData.hourlyRate}
            onChangeText={(value) => handleInputChange('hourlyRate', value)}
            placeholder="Ej: $80 USD"
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Biografía</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Descripción Profesional</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.bio}
            onChangeText={(value) => handleInputChange('bio', value)}
            placeholder="Describe tu experiencia y especialidades..."
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={[styles.formButton, styles.cancelButton]} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.formButton, styles.saveButton]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Selector de Especialidad */}
      {showSpecialtyPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar Especialidad</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSpecialtyPicker(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {/* Campo de búsqueda */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar especialidad..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.pickerContent}>
              {filteredSpecialties.length > 0 ? (
                filteredSpecialties.map((specialty, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pickerOption,
                      formData.specialty === specialty && styles.pickerOptionSelected
                    ]}
                    onPress={() => handleSpecialtySelect(specialty)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.specialty === specialty && styles.pickerOptionTextSelected
                    ]}>
                      {specialty}
                    </Text>
                    {formData.specialty === specialty && (
                      <Text style={styles.pickerCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No se encontraron especialidades que coincidan con "{searchQuery}"
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Modal Selector de Profesión */}
      {showProfessionPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar Profesión</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowProfessionPicker(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {/* Campo de búsqueda para profesiones */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar profesión..."
                value={professionSearchQuery}
                onChangeText={setProfessionSearchQuery}
                autoFocus={true}
              />
              {professionSearchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setProfessionSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.pickerContent}>
              {filteredProfessions.length > 0 ? (
                filteredProfessions.map((profession, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pickerOption,
                      formData.profession === profession && styles.pickerOptionSelected
                    ]}
                    onPress={() => handleProfessionSelect(profession)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.profession === profession && styles.pickerOptionTextSelected
                    ]}>
                      {profession}
                    </Text>
                    {formData.profession === profession && (
                      <Text style={styles.pickerCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No se encontraron profesiones que coincidan con "{professionSearchQuery}"
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const ProfessionalProfileForm = ({ professionalData, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    profession: professionalData.profession || '',
    specialty: professionalData.specialty || '',
    experience: professionalData.experience || '',
    education: professionalData.education || '',
    bio: professionalData.bio || '',
    hourlyRate: professionalData.hourlyRate || ''
  });
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [showProfessionPicker, setShowProfessionPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [professionSearchQuery, setProfessionSearchQuery] = useState('');

  const professions = [
    'Psicólogo/a',
    'Psiquiatra',
    'Terapeuta',
    'Counselor',
    'Coach',
    'Neuropsicólogo/a',
    'Psicopedagogo/a',
    'Psicólogo/a Forense',
    'Psicólogo/a Organizacional',
    'Psicólogo/a Deportivo',
    'Psicólogo/a Clínico',
    'Psicólogo/a Infantil',
    'Psicólogo/a Familiar',
    'Psicólogo/a de la Salud',
    'Psicólogo/a Social',
    'Psicólogo/a Educativo',
    'Psicólogo/a Comunitario',
    'Psicólogo/a Militar',
    'Psicólogo/a del Tráfico',
    'Psicólogo/a de la Adicción',
    'Psicólogo/a de la Violencia',
    'Psicólogo/a de la Sexualidad',
    'Psicólogo/a de la Religión',
    'Psicólogo/a de la Creatividad',
    'Psicólogo/a de las Artes',
    'Psicólogo/a de la Comunicación',
    'Psicólogo/a de la Publicidad',
    'Psicólogo/a del Consumo',
    'Psicólogo/a de la Moda',
    'Psicólogo/a del Turismo',
    'Psicólogo/a de la Alimentación',
    'Psicólogo/a del Ejercicio',
    'Psicólogo/a del Sueño',
    'Psicólogo/a del Dolor',
    'Psicólogo/a de la Maternidad',
    'Psicólogo/a de la Paternidad',
    'Psicólogo/a del Duelo',
    'Psicólogo/a de la Resiliencia',
    'Psicólogo/a de la Felicidad',
    'Psicólogo/a del Bienestar',
    'Psicólogo/a de la Espiritualidad',
    'Psicólogo/a de la Consciencia',
    'Psicólogo/a de la Meditación',
    'Psicólogo/a de la Hipnosis',
    'Psicólogo/a de la Biofeedback',
    'Psicólogo/a de la Neurociencia',
    'Psicólogo/a de la Genética',
    'Psicólogo/a de la Evolución',
    'Psicólogo/a de la Antropología',
    'Psicólogo/a de la Sociología',
    'Psicólogo/a de la Filosofía',
    'Psicólogo/a de la Historia',
    'Psicólogo/a de la Política',
    'Psicólogo/a de la Economía',
    'Psicólogo/a de la Tecnología',
    'Psicólogo/a Digital',
    'Psicólogo/a de las Redes Sociales',
    'Psicólogo/a de la Ciberseguridad',
    'Psicólogo/a de la Inteligencia Artificial',
    'Psicólogo/a de la Realidad Virtual',
    'Psicólogo/a de la Gamificación',
    'Psicólogo/a del Aprendizaje Online',
    'Psicólogo/a de la Educación Especial',
    'Psicólogo/a de la Superdotación',
    'Psicólogo/a de las Altas Capacidades',
    'Psicólogo/a de la Diversidad',
    'Psicólogo/a de la Inclusión',
    'Psicólogo/a de la Interculturalidad',
    'Psicólogo/a de la Migración',
    'Psicólogo/a de los Refugiados',
    'Psicólogo/a de la Pobreza',
    'Psicólogo/a de la Desigualdad',
    'Psicólogo/a de la Justicia Social',
    'Psicólogo/a de la Paz',
    'Psicólogo/a del Conflicto',
    'Psicólogo/a de la Negociación',
    'Psicólogo/a de la Mediación',
    'Psicólogo/a de la Arbitraje',
    'Psicólogo/a de la Conciliación',
    'Psicólogo/a de la Reconciliación',
    'Psicólogo/a de la Perdón',
    'Psicólogo/a de la Compasión',
    'Psicólogo/a de la Empatía',
    'Psicólogo/a de la Asertividad',
    'Psicólogo/a de la Inteligencia Emocional',
    'Psicólogo/a de la Regulación Emocional',
    'Psicólogo/a de la Autoconsciencia',
    'Psicólogo/a de la Autogestión',
    'Psicólogo/a de la Motivación Intrínseca',
    'Psicólogo/a de la Motivación Extrínseca',
    'Psicólogo/a de la Autodeterminación'
  ];

  const specialties = [
    'Psicología Clínica',
    'Psicología Infantil',
    'Psicología Familiar',
    'Psicología de la Salud',
    'Psicología Social',
    'Psicología Educativa',
    'Psicología Organizacional',
    'Psicología Forense',
    'Psicología Deportiva',
    'Psicología Militar',
    'Psicología del Tráfico',
    'Psicología de la Adicción',
    'Psicología de la Violencia',
    'Psicología de la Sexualidad',
    'Psicología de la Religión',
    'Psicología de la Creatividad',
    'Psicología de las Artes',
    'Psicología de la Comunicación',
    'Psicología de la Publicidad',
    'Psicología del Consumo',
    'Psicología de la Moda',
    'Psicología del Turismo',
    'Psicología de la Alimentación',
    'Psicología del Ejercicio',
    'Psicología del Sueño',
    'Psicología del Dolor',
    'Psicología de la Maternidad',
    'Psicología de la Paternidad',
    'Psicología del Duelo',
    'Psicología de la Resiliencia',
    'Psicología de la Felicidad',
    'Psicología del Bienestar',
    'Psicología de la Espiritualidad',
    'Psicología de la Consciencia',
    'Psicología de la Meditación',
    'Psicología de la Hipnosis',
    'Psicología de la Biofeedback',
    'Psicología de la Neurociencia',
    'Psicología de la Genética',
    'Psicología de la Evolución',
    'Psicología de la Antropología',
    'Psicología de la Sociología',
    'Psicología de la Filosofía',
    'Psicología de la Historia',
    'Psicología de la Política',
    'Psicología de la Economía',
    'Psicología de la Tecnología',
    'Psicología Digital',
    'Psicología de las Redes Sociales',
    'Psicología de la Ciberseguridad',
    'Psicología de la Inteligencia Artificial',
    'Psicología de la Realidad Virtual',
    'Psicología de la Gamificación',
    'Psicología del Aprendizaje Online',
    'Psicología de la Educación Especial',
    'Psicología de la Superdotación',
    'Psicología de las Altas Capacidades',
    'Psicología de la Diversidad',
    'Psicología de la Inclusión',
    'Psicología de la Interculturalidad',
    'Psicología de la Migración',
    'Psicología de los Refugiados',
    'Psicología de la Pobreza',
    'Psicología de la Desigualdad',
    'Psicología de la Justicia Social',
    'Psicología de la Paz',
    'Psicología del Conflicto',
    'Psicología de la Negociación',
    'Psicología de la Mediación',
    'Psicología de la Arbitraje',
    'Psicología de la Conciliación',
    'Psicología de la Reconciliación',
    'Psicología de la Perdón',
    'Psicología de la Compasión',
    'Psicología de la Empatía',
    'Psicología de la Asertividad',
    'Psicología de la Inteligencia Emocional',
    'Psicología de la Regulación Emocional',
    'Psicología de la Autoconsciencia',
    'Psicología de la Autogestión',
    'Psicología de la Motivación Intrínseca',
    'Psicología de la Motivación Extrínseca',
    'Psicología de la Autodeterminación'
  ];

  const filteredProfessions = professions.filter(profession =>
    profession.toLowerCase().includes(professionSearchQuery.toLowerCase())
  );

  const getSpecialtiesForProfession = (profession) => {
    const professionMap = {
      'Psicólogo/a': [
        'Psicología Clínica',
        'Psicología Infantil',
        'Psicología Familiar',
        'Psicología de la Salud',
        'Psicología Social',
        'Psicología Educativa',
        'Psicología Organizacional',
        'Psicología Forense',
        'Psicología Deportiva',
        'Psicología Militar',
        'Psicología del Tráfico',
        'Psicología de la Adicción',
        'Psicología de la Violencia',
        'Psicología de la Sexualidad',
        'Psicología de la Religión',
        'Psicología de la Creatividad',
        'Psicología de las Artes',
        'Psicología de la Comunicación',
        'Psicología de la Publicidad',
        'Psicología del Consumo',
        'Psicología de la Moda',
        'Psicología del Turismo',
        'Psicología de la Alimentación',
        'Psicología del Ejercicio',
        'Psicología del Sueño',
        'Psicología del Dolor',
        'Psicología de la Maternidad',
        'Psicología de la Paternidad',
        'Psicología del Duelo',
        'Psicología de la Resiliencia',
        'Psicología de la Felicidad',
        'Psicología del Bienestar',
        'Psicología de la Espiritualidad',
        'Psicología de la Consciencia',
        'Psicología de la Meditación',
        'Psicología de la Hipnosis',
        'Psicología de la Biofeedback',
        'Psicología de la Neurociencia',
        'Psicología de la Genética',
        'Psicología de la Evolución',
        'Psicología de la Antropología',
        'Psicología de la Sociología',
        'Psicología de la Filosofía',
        'Psicología de la Historia',
        'Psicología de la Política',
        'Psicología de la Economía',
        'Psicología de la Tecnología',
        'Psicología Digital',
        'Psicología de las Redes Sociales',
        'Psicología de la Ciberseguridad',
        'Psicología de la Inteligencia Artificial',
        'Psicología de la Realidad Virtual',
        'Psicología de la Gamificación',
        'Psicología del Aprendizaje Online',
        'Psicología de la Educación Especial',
        'Psicología de la Superdotación',
        'Psicología de las Altas Capacidades',
        'Psicología de la Diversidad',
        'Psicología de la Inclusión',
        'Psicología de la Interculturalidad',
        'Psicología de la Migración',
        'Psicología de los Refugiados',
        'Psicología de la Pobreza',
        'Psicología de la Desigualdad',
        'Psicología de la Justicia Social',
        'Psicología de la Paz',
        'Psicología del Conflicto',
        'Psicología de la Negociación',
        'Psicología de la Mediación',
        'Psicología de la Arbitraje',
        'Psicología de la Conciliación',
        'Psicología de la Reconciliación',
        'Psicología de la Perdón',
        'Psicología de la Compasión',
        'Psicología de la Empatía',
        'Psicología de la Asertividad',
        'Psicología de la Inteligencia Emocional',
        'Psicología de la Regulación Emocional',
        'Psicología de la Autoconsciencia',
        'Psicología de la Autogestión',
        'Psicología de la Motivación Intrínseca',
        'Psicología de la Motivación Extrínseca',
        'Psicología de la Autodeterminación'
      ],
      'Psiquiatra': [
        'Psiquiatría General',
        'Psiquiatría Infantil y Adolescente',
        'Psiquiatría de Adultos',
        'Psiquiatría Geriátrica',
        'Psiquiatría Forense',
        'Psiquiatría de Adicciones',
        'Psiquiatría de Urgencias',
        'Psiquiatría Comunitaria',
        'Psiquiatría Biológica',
        'Psiquiatría Social',
        'Psiquiatría Cultural',
        'Psiquiatría Transcultural',
        'Psiquiatría Militar',
        'Psiquiatría del Trabajo',
        'Psiquiatría Deportiva',
        'Psiquiatría de la Mujer',
        'Psiquiatría Perinatal',
        'Psiquiatría de la Tercera Edad',
        'Psiquiatría de Enlace',
        'Psiquiatría de Consulta',
        'Psiquiatría de Rehabilitación',
        'Psiquiatría de Prevención',
        'Psiquiatría de Investigación',
        'Psiquiatría Clínica',
        'Psiquiatría Académica',
        'Psiquiatría Hospitalaria',
        'Psiquiatría Ambulatoria',
        'Psiquiatría de Crisis',
        'Psiquiatría de Emergencias',
        'Psiquiatría de Desastres',
        'Psiquiatría de Catástrofes',
        'Psiquiatría de Emergencias Médicas',
        'Psiquiatría de Emergencias Psiquiátricas',
        'Psiquiatría de Emergencias Sociales',
        'Psiquiatría de Emergencias Familiares',
        'Psiquiatría de Emergencias Comunitarias',
        'Psiquiatría de Emergencias Nacionales',
        'Psiquiatría de Emergencias Internacionales'
      ],
      'Terapeuta': [
        'Terapia Cognitivo-Conductual',
        'Terapia Sistémica Familiar',
        'Terapia Gestalt',
        'Terapia Psicoanalítica',
        'Terapia Humanista',
        'Terapia Existencial',
        'Terapia de Aceptación y Compromiso',
        'Terapia Dialéctica Conductual',
        'Terapia de Esquemas',
        'Terapia de Pareja',
        'Terapia Sexual',
        'Terapia de Grupo',
        'Terapia de Arte',
        'Terapia de Música',
        'Terapia de Danza',
        'Terapia de Drama',
        'Terapia de Juego',
        'Terapia de Arena',
        'Terapia de Movimiento',
        'Terapia Corporal',
        'Terapia de Respiración',
        'Terapia de Relajación',
        'Terapia de Meditación',
        'Terapia de Mindfulness',
        'Terapia de Hipnosis',
        'Terapia de Biofeedback',
        'Terapia de Neurofeedback',
        'Terapia de Realidad Virtual',
        'Terapia de Gamificación',
        'Terapia Online',
        'Terapia a Distancia',
        'Terapia Telefónica',
        'Terapia por Video',
        'Terapia por Chat',
        'Terapia por Email',
        'Terapia por Aplicación',
        'Terapia por Inteligencia Artificial',
        'Terapia por Chatbot',
        'Terapia por Asistente Virtual',
        'Terapia por Sistema Experto',
        'Terapia por Red Neuronal',
        'Terapia por Algoritmo',
        'Terapia por Machine Learning',
        'Terapia por Deep Learning',
        'Terapia por Big Data',
        'Terapia por Análisis Predictivo',
        'Terapia por Personalización',
        'Terapia por Adaptación Dinámica',
        'Terapia por Optimización Continua',
        'Terapia por Mejora Constante',
        'Terapia por Innovación',
        'Terapia por Creatividad',
        'Terapia por Originalidad',
        'Terapia por Unicidad',
        'Terapia por Singularidad',
        'Terapia por Excepcionalidad',
        'Terapia por Excelencia',
        'Terapia por Maestría',
        'Terapia por Perfección',
        'Terapia por Trascendencia',
        'Terapia por Evolución',
        'Terapia por Transformación',
        'Terapia por Metamorfosis',
        'Terapia por Renacimiento',
        'Terapia por Iluminación',
        'Terapia por Despertar',
        'Terapia por Consciencia',
        'Terapia por Presencia',
        'Terapia por Aquí y Ahora',
        'Terapia por Momento Presente',
        'Terapia por Eternidad',
        'Terapia por Infinito',
        'Terapia por Absoluto',
        'Terapia por Divino',
        'Terapia por Sagrado',
        'Terapia por Profundo',
        'Terapia por Esencial',
        'Terapia por Fundamental',
        'Terapia por Básico',
        'Terapia por Primario',
        'Terapia por Secundario',
        'Terapia por Terciario',
        'Terapia por Cuaternario',
        'Terapia por Quinario',
        'Terapia por Senario',
        'Terapia por Septenario',
        'Terapia por Octonario',
        'Terapia por Nonario',
        'Terapia por Decenario',
        'Terapia por Centenario',
        'Terapia por Milenario',
        'Terapia por Eonario',
        'Terapia por Cósmico',
        'Terapia por Universal',
        'Terapia por Total',
        'Terapia por Completo',
        'Terapia por Integral',
        'Terapia por Holístico',
        'Terapia por Sistémico',
        'Terapia por Ecológico',
        'Terapia por Sostenible',
        'Terapia por Regenerativo',
        'Terapia por Restaurativo',
        'Terapia por Curativo',
        'Terapia por Sanador',
        'Terapia por Medicinal',
        'Terapia por Terapéutico'
      ],
      'Counselor': [
        'Counseling Personal',
        'Counseling Familiar',
        'Counseling de Pareja',
        'Counseling Vocacional',
        'Counseling Educativo',
        'Counseling Laboral',
        'Counseling de Carrera',
        'Counseling de Desarrollo',
        'Counseling de Crecimiento',
        'Counseling de Bienestar',
        'Counseling de Salud',
        'Counseling de Nutrición',
        'Counseling de Ejercicio',
        'Counseling de Sueño',
        'Counseling de Estrés',
        'Counseling de Ansiedad',
        'Counseling de Depresión',
        'Counseling de Duelo',
        'Counseling de Trauma',
        'Counseling de Crisis',
        'Counseling de Emergencias',
        'Counseling de Desastres',
        'Counseling de Catástrofes',
        'Counseling de Emergencias Médicas',
        'Counseling de Emergencias Psicológicas',
        'Counseling de Emergencias Sociales',
        'Counseling de Emergencias Familiares',
        'Counseling de Emergencias Comunitarias',
        'Counseling de Emergencias Nacionales',
        'Counseling de Emergencias Internacionales'
      ],
      'Coach': [
        'Personal Trainer',
        'Coaching Ejecutivo',
        'Coaching de Vida',
        'Coaching de Carrera',
        'Coaching de Negocios',
        'Coaching de Liderazgo',
        'Coaching de Equipos',
        'Coaching de Ventas',
        'Coaching de Marketing',
        'Coaching de Finanzas',
        'Coaching de Salud',
        'Coaching de Fitness',
        'Coaching de Nutrición',
        'Coaching de Relaciones',
        'Coaching de Comunicación',
        'Coaching de Presentación',
        'Coaching de Habla en Público',
        'Coaching de Oratoria',
        'Coaching de Persuasión',
        'Coaching de Negociación',
        'Coaching de Resolución de Conflictos',
        'Coaching de Toma de Decisiones',
        'Coaching de Gestión del Tiempo',
        'Coaching de Productividad',
        'Coaching de Organización',
        'Coaching de Planificación',
        'Coaching de Estrategia',
        'Coaching de Innovación',
        'Coaching de Creatividad',
        'Coaching de Emprendimiento',
        'Coaching de Startups',
        'Coaching de Escalabilidad',
        'Coaching de Crecimiento',
        'Coaching de Desarrollo',
        'Coaching de Transformación',
        'Coaching de Cambio',
        'Coaching de Transición',
        'Coaching de Adaptación',
        'Coaching de Flexibilidad',
        'Coaching de Resiliencia',
        'Coaching de Fortaleza Mental',
        'Coaching de Confianza',
        'Coaching de Autoestima',
        'Coaching de Motivación',
        'Coaching de Inspiración',
        'Coaching de Empoderamiento',
        'Coaching de Autonomía',
        'Coaching de Independencia',
        'Coaching de Libertad',
        'Coaching de Autenticidad',
        'Coaching de Propósito',
        'Coaching de Visión',
        'Coaching de Misión',
        'Coaching de Valores',
        'Coaching de Principios',
        'Coaching de Ética',
        'Coaching de Integridad',
        'Coaching de Honestidad',
        'Coaching de Transparencia',
        'Coaching de Responsabilidad',
        'Coaching de Compromiso',
        'Coaching de Dedicación',
        'Coaching de Perseverancia',
        'Coaching de Constancia',
        'Coaching de Disciplina',
        'Coaching de Hábitos',
        'Coaching de Rutinas',
        'Coaching de Sistemas',
        'Coaching de Procesos',
        'Coaching de Metodologías',
        'Coaching de Herramientas',
        'Coaching de Técnicas',
        'Coaching de Estrategias',
        'Coaching de Tácticas',
        'Coaching de Planes',
        'Coaching de Programas',
        'Coaching de Cursos',
        'Coaching de Talleres',
        'Coaching de Seminarios',
        'Coaching de Conferencias',
        'Coaching de Webinars',
        'Coaching de Podcasts',
        'Coaching de Videos',
        'Coaching de Libros',
        'Coaching de Artículos',
        'Coaching de Blogs',
        'Coaching de Redes Sociales',
        'Coaching de Marketing Digital',
        'Coaching de SEO',
        'Coaching de SEM',
        'Coaching de Email Marketing',
        'Coaching de Marketing de Contenido',
        'Coaching de Marketing de Influencers',
        'Coaching de Marketing de Afiliados',
        'Coaching de Marketing de Guerrilla',
        'Coaching de Marketing Viral',
        'Coaching de Marketing de Boca en Boca',
        'Coaching de Marketing de Referidos',
        'Coaching de Marketing de Fidelización',
        'Coaching de Marketing de Retención',
        'Coaching de Marketing de Reactivación',
        'Coaching de Marketing de Conversión',
        'Coaching de Marketing de Optimización',
        'Coaching de Marketing de Automatización',
        'Coaching de Marketing de Personalización',
        'Coaching de Marketing de Segmentación',
        'Coaching de Marketing de Targeting',
        'Coaching de Marketing de Posicionamiento',
        'Coaching de Marketing de Branding',
        'Coaching de Marketing de Reputación',
        'Coaching de Marketing de Credibilidad',
        'Coaching de Marketing de Confianza',
        'Coaching de Marketing de Autoridad',
        'Coaching de Marketing de Liderazgo',
        'Coaching de Marketing de Innovación',
        'Coaching de Marketing de Disrupción',
        'Coaching de Marketing de Transformación',
        'Coaching de Marketing de Revolución',
        'Coaching de Marketing de Evolución',
        'Coaching de Marketing de Adaptación',
        'Coaching de Marketing de Flexibilidad',
        'Coaching de Marketing de Agilidad',
        'Coaching de Marketing de Velocidad',
        'Coaching de Marketing de Eficiencia',
        'Coaching de Marketing de Efectividad',
        'Coaching de Marketing de Rentabilidad',
        'Coaching de Marketing de Sostenibilidad',
        'Coaching de Marketing de Responsabilidad Social',
        'Coaching de Marketing de Impacto',
        'Coaching de Marketing de Valor',
        'Coaching de Marketing de Beneficios',
        'Coaching de Marketing de Soluciones',
        'Coaching de Marketing de Problemas',
        'Coaching de Marketing de Necesidades',
        'Coaching de Marketing de Deseos',
        'Coaching de Marketing de Aspiraciones',
        'Coaching de Marketing de Sueños',
        'Coaching de Marketing de Metas',
        'Coaching de Marketing de Objetivos',
        'Coaching de Marketing de Resultados',
        'Coaching de Marketing de Logros',
        'Coaching de Marketing de Éxito',
        'Coaching de Marketing de Triunfo',
        'Coaching de Marketing de Victoria',
        'Coaching de Marketing de Conquista',
        'Coaching de Marketing de Dominio',
        'Coaching de Marketing de Maestría',
        'Coaching de Marketing de Excelencia',
        'Coaching de Marketing de Perfección',
        'Coaching de Marketing de Trascendencia',
        'Coaching de Marketing de Evolución',
        'Coaching de Marketing de Transformación',
        'Coaching de Marketing de Metamorfosis',
        'Coaching de Marketing de Renacimiento',
        'Coaching de Marketing de Iluminación',
        'Coaching de Marketing de Despertar',
        'Coaching de Marketing de Consciencia',
        'Coaching de Marketing de Presencia',
        'Coaching de Marketing de Aquí y Ahora',
        'Coaching de Marketing de Momento Presente',
        'Coaching de Marketing de Eternidad',
        'Coaching de Marketing de Infinito',
        'Coaching de Marketing de Absoluto',
        'Coaching de Marketing de Divino',
        'Coaching de Marketing de Sagrado',
        'Coaching de Marketing de Profundo',
        'Coaching de Marketing de Esencial',
        'Coaching de Marketing de Fundamental',
        'Coaching de Marketing de Básico',
        'Coaching de Marketing de Primario',
        'Coaching de Marketing de Secundario',
        'Coaching de Marketing de Terciario',
        'Coaching de Marketing de Cuaternario',
        'Coaching de Marketing de Quinario',
        'Coaching de Marketing de Senario',
        'Coaching de Marketing de Septenario',
        'Coaching de Marketing de Octonario',
        'Coaching de Marketing de Nonario',
        'Coaching de Marketing de Decenario',
        'Coaching de Marketing de Centenario',
        'Coaching de Marketing de Milenario',
        'Coaching de Marketing de Eonario',
        'Coaching de Marketing de Cósmico',
        'Coaching de Marketing de Universal',
        'Coaching de Marketing de Total',
        'Coaching de Marketing de Completo',
        'Coaching de Marketing de Integral',
        'Coaching de Marketing de Holístico',
        'Coaching de Marketing de Sistémico',
        'Coaching de Marketing de Ecológico',
        'Coaching de Marketing de Sostenible',
        'Coaching de Marketing de Regenerativo',
        'Coaching de Marketing de Restaurativo',
        'Coaching de Marketing de Curativo',
        'Coaching de Marketing de Sanador',
        'Coaching de Marketing de Medicinal',
        'Coaching de Marketing de Terapéutico'
      ],
      'Neuropsicólogo/a': [
        'Neuropsicología Clínica',
        'Neuropsicología Infantil',
        'Neuropsicología del Desarrollo',
        'Neuropsicología del Envejecimiento',
        'Neuropsicología Forense',
        'Neuropsicología de la Rehabilitación',
        'Neuropsicología Cognitiva',
        'Neuropsicología Conductual',
        'Neuropsicología Afectiva',
        'Neuropsicología Social',
        'Neuropsicología Cultural',
        'Neuropsicología Transcultural',
        'Neuropsicología Militar',
        'Neuropsicología del Trabajo',
        'Neuropsicología Deportiva',
        'Neuropsicología de la Mujer',
        'Neuropsicología Perinatal',
        'Neuropsicología de la Tercera Edad',
        'Neuropsicología de Enlace',
        'Neuropsicología de Consulta',
        'Neuropsicología de Rehabilitación',
        'Neuropsicología de Prevención',
        'Neuropsicología de Investigación',
        'Neuropsicología Clínica',
        'Neuropsicología Académica',
        'Neuropsicología Hospitalaria',
        'Neuropsicología Ambulatoria',
        'Neuropsicología de Crisis',
        'Neuropsicología de Emergencias',
        'Neuropsicología de Desastres',
        'Neuropsicología de Catástrofes',
        'Neuropsicología de Emergencias Médicas',
        'Neuropsicología de Emergencias Psicológicas',
        'Neuropsicología de Emergencias Sociales',
        'Neuropsicología de Emergencias Familiares',
        'Neuropsicología de Emergencias Comunitarias',
        'Neuropsicología de Emergencias Nacionales',
        'Neuropsicología de Emergencias Internacionales'
      ]
    };
    
    return professionMap[profession] || [];
  };

  const filteredSpecialties = getSpecialtiesForProfession(formData.profession).filter(specialty =>
    specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleSpecialtySelect = (specialty) => {
    handleInputChange('specialty', specialty);
    setShowSpecialtyPicker(false);
    setSearchQuery('');
  };

  const handleProfessionSelect = (profession) => {
    handleInputChange('profession', profession);
    // Limpiar especialidad si no es compatible con la nueva profesión
    if (formData.specialty) {
      const isCompatible = filteredSpecialties.some(specialty => 
        specialty === formData.specialty
      );
      if (!isCompatible) {
        handleInputChange('specialty', '');
      }
    }
    setShowProfessionPicker(false);
    setProfessionSearchQuery(''); // Limpiar búsqueda al seleccionar
  };

  return (
    <View style={styles.profileForm}>
      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Información Profesional</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Profesión</Text>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => setShowProfessionPicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              {formData.profession || 'Seleccionar profesión'}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Especialidad</Text>
          <TouchableOpacity 
            style={[
              styles.pickerButton,
              !formData.profession && styles.pickerButtonDisabled
            ]}
            onPress={() => formData.profession && setShowSpecialtyPicker(true)}
            disabled={!formData.profession}
          >
            <Text style={[
              styles.pickerButtonText,
              !formData.profession && styles.pickerButtonTextDisabled
            ]}>
              {formData.specialty || (formData.profession ? 'Seleccionar especialidad' : 'Primero selecciona una profesión')}
            </Text>
            <Text style={[
              styles.pickerArrow,
              !formData.profession && styles.pickerArrowDisabled
            ]}>▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Años de Experiencia</Text>
          <TextInput
            style={styles.textInput}
            value={formData.experience}
            onChangeText={(value) => handleInputChange('experience', value)}
            placeholder="Ej: 8 años"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Educación</Text>
          <TextInput
            style={styles.textInput}
            value={formData.education}
            onChangeText={(value) => handleInputChange('education', value)}
            placeholder="Título y universidad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tarifa por Hora</Text>
          <TextInput
            style={styles.textInput}
            value={formData.hourlyRate}
            onChangeText={(value) => handleInputChange('hourlyRate', value)}
            placeholder="Ej: $80 USD"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Biografía</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.bio}
            onChangeText={(value) => handleInputChange('bio', value)}
            placeholder="Describe tu experiencia y enfoque profesional..."
            multiline={true}
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Biografía</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Descripción Profesional</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={formData.bio}
            onChangeText={(value) => handleInputChange('bio', value)}
            placeholder="Describe tu experiencia y especialidades..."
            multiline
            numberOfLines={4}
          />
        </View>
      </View>

      <View style={styles.formActions}>
        <TouchableOpacity style={[styles.formButton, styles.cancelButton]} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.formButton, styles.saveButton]} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Selector de Especialidad */}
      {showSpecialtyPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar Especialidad</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSpecialtyPicker(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {/* Campo de búsqueda */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar especialidad..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.pickerContent}>
              {filteredSpecialties.length > 0 ? (
                filteredSpecialties.map((specialty, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pickerOption,
                      formData.specialty === specialty && styles.pickerOptionSelected
                    ]}
                    onPress={() => handleSpecialtySelect(specialty)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.specialty === specialty && styles.pickerOptionTextSelected
                    ]}>
                      {specialty}
                    </Text>
                    {formData.specialty === specialty && (
                      <Text style={styles.pickerCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No se encontraron especialidades que coincidan con "{searchQuery}"
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Modal Selector de Profesión */}
      {showProfessionPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Seleccionar Profesión</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowProfessionPicker(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            {/* Campo de búsqueda para profesiones */}
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar profesión..."
                value={professionSearchQuery}
                onChangeText={setProfessionSearchQuery}
                autoFocus={true}
              />
              {professionSearchQuery.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={() => setProfessionSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.pickerContent}>
              {filteredProfessions.length > 0 ? (
                filteredProfessions.map((profession, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pickerOption,
                      formData.profession === profession && styles.pickerOptionSelected
                    ]}
                    onPress={() => handleProfessionSelect(profession)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      formData.profession === profession && styles.pickerOptionTextSelected
                    ]}>
                      {profession}
                    </Text>
                    {formData.profession === profession && (
                      <Text style={styles.pickerCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    No se encontraron profesiones que coincidan con "{professionSearchQuery}"
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const SettingsScreen = ({ onNavigate }) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfessionalModal, setShowProfessionalModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Dr. María González',
    email: 'maria.gonzalez@email.com',
    phone: '+54 11 1234-5678',
    location: 'Buenos Aires, Argentina'
  });
  const [professionalData, setProfessionalData] = useState({
    profession: 'Psicólogo/a Clínico',
    specialty: 'Psicología Clínica',
    experience: '8 años',
    education: 'Licenciada en Psicología - UBA',
    bio: 'Especialista en terapia cognitivo-conductual con experiencia en tratamiento de ansiedad y depresión.',
    hourlyRate: '$80 USD'
  });

  const settings = [
    { title: 'Perfil Personal', subtitle: 'Editar información personal', icon: '👤' },
    { title: 'Información Profesional', subtitle: 'Editar datos profesionales', icon: '💼' },
    { title: 'Notificaciones', subtitle: 'Configurar alertas', icon: '🔔' },
    { title: 'Horarios', subtitle: 'Gestionar disponibilidad', icon: '⏰' },
    { title: 'Servicios', subtitle: 'Configurar servicios ofrecidos', icon: '🛠️' },
    { title: 'Pagos', subtitle: 'Configurar métodos de pago', icon: '💳' },
    { title: 'Privacidad', subtitle: 'Configuración de privacidad', icon: '🔒' }
  ];

  const handleProfilePress = () => {
    setShowProfileModal(true);
  };

  const handleProfessionalPress = () => {
    setShowProfessionalModal(true);
  };

  const handleSaveProfile = (updatedData) => {
    setProfileData(updatedData);
    setShowProfileModal(false);
  };

  const handleSaveProfessional = (updatedData) => {
    setProfessionalData(updatedData);
    setShowProfessionalModal(false);
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
  };

  const handleCloseProfessional = () => {
    setShowProfessionalModal(false);
  };

  return (
    <View style={styles.screen}>
      <BackButton onPress={() => onNavigate('dashboard')} />
      <Text style={styles.title}>Configuración</Text>
      <Text style={styles.subtitle}>
        Personaliza tu experiencia en Turnario
      </Text>
      
      <View style={styles.settingsContainer}>
        {settings.map((setting, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.settingItem}
            onPress={
              setting.title === 'Perfil Personal' ? handleProfilePress :
              setting.title === 'Información Profesional' ? handleProfessionalPress :
              null
            }
          >
            <View style={styles.settingIcon}>
              <Text style={styles.iconText}>{setting.icon}</Text>
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{setting.title}</Text>
              <Text style={styles.settingSubtitle}>{setting.subtitle}</Text>
            </View>
            <Text style={styles.settingArrow}>›</Text>
          </TouchableOpacity>
                 ))}
       </View>

      {/* Modal de Perfil Personal */}
      {showProfileModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Perfil Personal</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCloseProfile}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <PersonalProfileForm 
                profileData={profileData}
                onSave={handleSaveProfile}
                onCancel={handleCloseProfile}
              />
            </View>
          </View>
        </View>
      )}

      {/* Modal de Información Profesional */}
      {showProfessionalModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Información Profesional</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCloseProfessional}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <ProfessionalProfileForm 
                professionalData={professionalData}
                onSave={handleSaveProfessional}
                onCancel={handleCloseProfessional}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login');

  const navigate = (screen) => {
    setCurrentScreen(screen);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <LoginScreen onNavigate={navigate} />;
      case 'register':
        return <RegisterScreen onNavigate={navigate} />;
      case 'dashboard':
        return <DashboardScreen onNavigate={navigate} />;
      case 'appointments':
        return <AppointmentsScreen onNavigate={navigate} />;
      case 'schedule':
        return <ScheduleScreen onNavigate={navigate} />;
      case 'reservations':
        return <ReservationsScreen onNavigate={navigate} />;
      case 'statistics':
        return <StatisticsScreen onNavigate={navigate} />;
      case 'settings':
        return <SettingsScreen onNavigate={navigate} />;
      default:
        return <LoginScreen onNavigate={navigate} />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
}
