import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import { Card, Text, Group, Badge, Stack, Box, Button } from '@mantine/core';
import { IconHistory } from '@tabler/icons-react';

// AQI Color mapping
const getAqiColor = (aqi) => {
  switch (aqi) {
    case 1: return '#00E400';
    case 2: return '#FFFF00';
    case 3: return '#FF7E00';
    case 4: return '#FF0000';
    case 5: return '#8F3F97';
    default: return '#999999';
  }
};

const getAqiLabel = (aqi) => {
  switch (aqi) {
    case 1: return 'Добре';
    case 2: return 'Задовільно';
    case 3: return 'Помірно';
    case 4: return 'Погано';
    case 5: return 'Дуже погано';
    default: return 'Невідомо';
  }
};

const MapEvents = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

const FlyToClicked = ({ clickedData }) => {
  const map = useMap();
  useEffect(() => {
    if (clickedData && clickedData.lat && clickedData.lon) {
      map.flyTo([clickedData.lat, clickedData.lon], 8, { duration: 1 });
    }
  }, [clickedData, map]);
  return null;
};

export default function MapComponent({ data, onMapClick, clickedData, onViewHistory, onViewDetail }) {
  const center = data && data.length > 0 && data[0].lat 
    ? [data[0].lat, data[0].lon] 
    : [48.3794, 31.1656];

  const renderPollutantRows = (item) => (
    <Stack gap={4}>
      <Group justify="space-between"><Text size="xs" c="dimmed">PM2.5</Text><Text size="xs" fw={600}>{item.pm2_5} μg/m³</Text></Group>
      <Group justify="space-between"><Text size="xs" c="dimmed">PM10</Text><Text size="xs" fw={600}>{item.pm10} μg/m³</Text></Group>
      <Group justify="space-between"><Text size="xs" c="dimmed">O3</Text><Text size="xs" fw={600}>{item.o3} μg/m³</Text></Group>
      <Group justify="space-between"><Text size="xs" c="dimmed">NO2</Text><Text size="xs" fw={600}>{item.no2} μg/m³</Text></Group>
    </Stack>
  );

  return (
    <Card shadow="lg" p="0" radius="lg" withBorder style={{ height: '600px', overflow: 'hidden', border: 'none' }}>
      <MapContainer 
        center={center} 
        zoom={6} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', background: '#1a1b1e' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapEvents onMapClick={onMapClick} />
        <FlyToClicked clickedData={clickedData} />
        
        {/* Clicked point marker */}
        {clickedData && clickedData.lat && clickedData.lon && (
          <>
            <Circle
              center={[clickedData.lat, clickedData.lon]}
              pathOptions={{ fillColor: getAqiColor(clickedData.aqi), color: 'transparent', fillOpacity: 0.15 }}
              radius={25000}
            />
            <CircleMarker 
              center={[clickedData.lat, clickedData.lon]} 
              pathOptions={{ fillColor: getAqiColor(clickedData.aqi), color: '#fff', weight: 2, fillOpacity: 0.8 }}
              radius={14}
            >
              <Popup className="aqi-popup">
                <Box p="xs" style={{ minWidth: '220px' }}>
                  <Stack gap="xs">
                    <Text fw={700} size="lg" style={{ borderBottom: `2px solid ${getAqiColor(clickedData.aqi)}`, paddingBottom: '4px' }}>
                      {clickedData.region_name || 'Обрана точка'}
                    </Text>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>AQI:</Text>
                      <Badge variant="filled" color={getAqiColor(clickedData.aqi)} size="lg"
                        style={{ color: clickedData.aqi === 2 || clickedData.aqi === 3 ? '#000' : '#fff' }}>
                        {clickedData.aqi} — {getAqiLabel(clickedData.aqi)}
                      </Badge>
                    </Group>
                    {renderPollutantRows(clickedData)}
                    <Text size="xs" c="dimmed" mt="xs" fs="italic">
                      Оновлено: {clickedData.measured_at ? new Date(clickedData.measured_at).toLocaleTimeString('uk-UA') : new Date().toLocaleTimeString('uk-UA')}
                    </Text>
                    {onViewDetail && (
                      <Button size="xs" variant="light" color="teal" fullWidth mt="sm"
                        leftSection={<IconHistory size={14} />}
                        onClick={() => onViewDetail(clickedData.lat, clickedData.lon, clickedData.region_name)}>
                        Історія та прогноз
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Popup>
            </CircleMarker>
          </>
        )}

        {/* Saved region markers */}
        {data && data.map((region) => {
          if (!region.lat || !region.lon) return null;
          const color = getAqiColor(region.aqi);
          
          return (
            <React.Fragment key={region.region_id}>
              <Circle
                center={[region.lat, region.lon]}
                pathOptions={{ fillColor: color, color: 'transparent', fillOpacity: 0.15 }}
                radius={25000}
              />
              <CircleMarker 
                center={[region.lat, region.lon]} 
                pathOptions={{ fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.8 }}
                radius={12}
              >
                <Popup className="aqi-popup">
                  <Box p="xs" style={{ minWidth: '220px' }}>
                    <Stack gap="xs">
                      <Text fw={700} size="lg" style={{ borderBottom: `2px solid ${color}`, paddingBottom: '4px' }}>
                        {region.region_name}
                      </Text>
                      {region.aqi ? (
                        <>
                          <Group justify="space-between" mb="xs">
                            <Text size="sm" fw={500}>AQI:</Text>
                            <Badge variant="filled" color={color} size="lg"
                              style={{ color: region.aqi === 2 || region.aqi === 3 ? '#000' : '#fff' }}>
                              {region.aqi} — {getAqiLabel(region.aqi)}
                            </Badge>
                          </Group>
                          {renderPollutantRows(region)}
                          <Text size="xs" c="dimmed" mt="xs" fs="italic">
                            Оновлено: {new Date(region.measured_at).toLocaleTimeString('uk-UA')}
                          </Text>
                          {onViewDetail && (
                            <Button size="xs" variant="light" color="teal" fullWidth mt="sm"
                              leftSection={<IconHistory size={14} />}
                              onClick={() => onViewDetail(region.lat, region.lon, region.region_name)}>
                              Історія та прогноз
                            </Button>
                          )}
                        </>
                      ) : (
                        <Text size="sm" c="dimmed">Немає даних</Text>
                      )}
                    </Stack>
                  </Box>
                </Popup>
              </CircleMarker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </Card>
  );
}
