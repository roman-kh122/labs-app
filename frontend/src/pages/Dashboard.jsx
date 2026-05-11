import React, { useEffect, useState } from 'react';
import { Title, Container, Grid, Card, Text, Button, Group, Table, Badge, Loader, Center, Stack, TextInput, Modal, Accordion, Box, SegmentedControl, SimpleGrid, Paper, ThemeIcon } from '@mantine/core';
import { IconRefresh, IconMapPin, IconSearch, IconInfoCircle, IconHistory, IconChartLine, IconDroplet, IconWind, IconCloudFog } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { LineChart } from '@mantine/charts';
import { useDisclosure } from '@mantine/hooks';
import api from '../api/axiosConfig';
import MapComponent from '../components/MapComponent';

const getAqiColor = (aqi) => {
  if (!aqi) return 'gray';
  if (aqi <= 1) return 'teal';
  if (aqi === 2) return 'green';
  if (aqi === 3) return 'yellow';
  if (aqi === 4) return 'orange';
  return 'red';
};

const getAqiLabel = (aqi) => {
  if (!aqi) return 'Невідомо';
  if (aqi <= 1) return 'Добре';
  if (aqi === 2) return 'Задовільно';
  if (aqi === 3) return 'Помірно';
  if (aqi === 4) return 'Погано';
  return 'Дуже погано';
};

export default function Dashboard() {
  const [latestData, setLatestData] = useState([]);
  const [averagesData, setAveragesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [clickedData, setClickedData] = useState(null);

  // History/Forecast modal state
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [detailTab, setDetailTab] = useState('history');
  const [historyChartData, setHistoryChartData] = useState([]);
  const [forecastChartData, setForecastChartData] = useState([]);
  const [detailLocationName, setDetailLocationName] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailCoords, setDetailCoords] = useState({ lat: null, lon: null });

  const loadData = async () => {
    try {
      setLoading(true);
      const [latestRes, avgRes] = await Promise.all([
        api.get('/pollution/latest'),
        api.get('/pollution/averages')
      ]);
      setLatestData(latestRes.data);
      setAveragesData(avgRes.data);
    } catch (err) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося завантажити дані', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFetchUpdate = async () => {
    try {
      setFetching(true);
      await api.post('/pollution/fetch-all');
      notifications.show({ title: 'Успіх', message: 'Дані успішно оновлено', color: 'teal' });
      await loadData();
    } catch (err) {
      notifications.show({ title: 'Помилка', message: err.response?.data?.error || 'Помилка оновлення', color: 'red' });
    } finally {
      setFetching(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const res = await api.get(`/pollution/search?q=${encodeURIComponent(searchQuery)}`);
      const { lat, lon, name, pollution } = res.data;
      if (pollution && pollution.list && pollution.list.length > 0) {
        const item = pollution.list[0];
        setClickedData({
          lat, lon, region_name: name,
          aqi: item.main.aqi,
          pm2_5: item.components.pm2_5,
          pm10: item.components.pm10,
          o3: item.components.o3,
          no2: item.components.no2,
          co: item.components.co,
          measured_at: item.dt * 1000
        });
      }
    } catch (err) {
      notifications.show({ title: 'Помилка', message: err.response?.data?.error || 'Місто не знайдено', color: 'red' });
    } finally {
      setSearching(false);
    }
  };

  const handleMapClick = async (lat, lon) => {
    try {
      const res = await api.get(`/pollution/current?lat=${lat}&lon=${lon}`);
      if (res.data && res.data.list && res.data.list.length > 0) {
        const item = res.data.list[0];
        setClickedData({
          lat, lon, region_name: `Точка (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          aqi: item.main.aqi,
          pm2_5: item.components.pm2_5,
          pm10: item.components.pm10,
          o3: item.components.o3,
          no2: item.components.no2,
          co: item.components.co,
          measured_at: item.dt * 1000
        });
      }
    } catch (err) {
      notifications.show({ title: 'Помилка', message: 'Не вдалося отримати дані для точки', color: 'red' });
    }
  };

  const formatDt = (dt) => {
    const d = new Date(dt * 1000);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    return `${day}.${month} ${hours}:00`;
  };

  const loadDetailData = async (lat, lon, name) => {
    setDetailLocationName(name);
    setDetailCoords({ lat, lon });
    setDetailTab('forecast');
    openDetail();
    setDetailLoading(true);
    setHistoryChartData([]);
    setForecastChartData([]);

    // Load history and forecast independently
    const loadHistory = async () => {
      try {
        const histRes = await api.get(`/pollution/history-coords?lat=${lat}&lon=${lon}`);
        // Response can be { source, data } or raw array
        const histItems = histRes.data?.data || histRes.data || [];
        setHistoryChartData(
          histItems.map(d => ({
            date: formatDt(d.dt),
            AQI: d.aqi,
            'PM2.5': d.pm2_5,
            PM10: d.pm10,
            NO2: d.no2,
            O3: d.o3,
          }))
        );
      } catch (err) {
        console.error('History load error:', err);
        setHistoryChartData([]);
      }
    };

    const loadForecast = async () => {
      try {
        const fcRes = await api.get(`/pollution/forecast?lat=${lat}&lon=${lon}`);
        const fcItems = fcRes.data || [];
        setForecastChartData(
          fcItems.map(d => ({
            date: formatDt(d.dt),
            AQI: d.aqi,
            'PM2.5': d.pm2_5,
            PM10: d.pm10,
            NO2: d.no2,
            O3: d.o3,
          }))
        );
      } catch (err) {
        console.error('Forecast load error:', err);
        setForecastChartData([]);
      }
    };

    await Promise.allSettled([loadHistory(), loadForecast()]);
    setDetailLoading(false);
  };

  // Called from popup buttons or map interaction
  const handleViewDetail = (lat, lon, name) => {
    loadDetailData(lat, lon, name);
  };

  // For existing regions from the popup
  const handleViewRegionDetail = (regionId, regionName) => {
    const region = latestData.find(r => r.region_id === regionId);
    if (region) {
      loadDetailData(region.lat, region.lon, regionName);
    }
  };

  if (loading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader color="teal" size="xl" type="dots" />
      </Center>
    );
  }

  const rows = averagesData.map((element) => (
    <Table.Tr key={element.region_id} style={{ cursor: 'pointer' }} onClick={() => loadDetailData(element.lat, element.lon, element.region_name)}>
      <Table.Td>
        <Group gap="xs">
          <IconMapPin size={16} />
          <Text fw={500}>{element.region_name}</Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={getAqiColor(Math.round(element.avg_aqi))}>
          {element.avg_aqi ? element.avg_aqi : 'N/A'}
        </Badge>
      </Table.Td>
      <Table.Td>{element.avg_pm2_5 || '-'}</Table.Td>
      <Table.Td>{element.avg_pm10 || '-'}</Table.Td>
      <Table.Td>{element.avg_no2 || '-'}</Table.Td>
      <Table.Td>{element.avg_co || '-'}</Table.Td>
      <Table.Td>{element.measurements_count}</Table.Td>
    </Table.Tr>
  ));

  const activeChartData = detailTab === 'history' ? historyChartData : forecastChartData;

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Stack gap={0}>
          <Title order={2} style={{ fontFamily: 'Greycliff CF, var(--mantine-font-family)' }}>Екологічні показники</Title>
          <Text c="dimmed">Огляд забруднення повітря у реальному часі та середні значення</Text>
        </Stack>
        <Group>
          <TextInput
            placeholder="Знайти місто..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            rightSection={
              searching ? <Loader size="xs" /> : <IconSearch size={16} style={{ cursor: 'pointer' }} onClick={handleSearch} />
            }
          />
          <Button 
            leftSection={<IconRefresh size={18} />} 
            color="teal" 
            onClick={handleFetchUpdate}
            loading={fetching}
          >
            Оновити дані
          </Button>
        </Group>
      </Group>

      {/* Current clicked data summary */}
      {clickedData && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg" style={{ background: 'var(--mantine-color-dark-7)', borderLeft: `4px solid ${clickedData.aqi <= 2 ? '#00E400' : clickedData.aqi <= 3 ? '#FF7E00' : '#FF0000'}` }}>
          <Group justify="space-between" align="flex-start">
            <Stack gap="xs">
              <Group gap="sm">
                <IconMapPin size={20} />
                <Title order={4}>{clickedData.region_name}</Title>
                <Badge size="lg" color={getAqiColor(clickedData.aqi)} variant="filled">
                  AQI: {clickedData.aqi} — {getAqiLabel(clickedData.aqi)}
                </Badge>
              </Group>
              <SimpleGrid cols={5} spacing="xs">
                <Paper p="xs" radius="sm" withBorder>
                  <Text size="xs" c="dimmed">PM2.5</Text>
                  <Text fw={600}>{clickedData.pm2_5} μg/m³</Text>
                </Paper>
                <Paper p="xs" radius="sm" withBorder>
                  <Text size="xs" c="dimmed">PM10</Text>
                  <Text fw={600}>{clickedData.pm10} μg/m³</Text>
                </Paper>
                <Paper p="xs" radius="sm" withBorder>
                  <Text size="xs" c="dimmed">O3</Text>
                  <Text fw={600}>{clickedData.o3} μg/m³</Text>
                </Paper>
                <Paper p="xs" radius="sm" withBorder>
                  <Text size="xs" c="dimmed">NO2</Text>
                  <Text fw={600}>{clickedData.no2} μg/m³</Text>
                </Paper>
                <Paper p="xs" radius="sm" withBorder>
                  <Text size="xs" c="dimmed">CO</Text>
                  <Text fw={600}>{clickedData.co} μg/m³</Text>
                </Paper>
              </SimpleGrid>
            </Stack>
            <Button
              variant="light"
              color="teal"
              leftSection={<IconHistory size={16} />}
              onClick={() => handleViewDetail(clickedData.lat, clickedData.lon, clickedData.region_name)}
            >
              Історія та прогноз
            </Button>
          </Group>
        </Card>
      )}

      <Grid>
        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Title order={4} mb="md">Інтерактивна карта якості повітря</Title>
            <MapComponent
              data={latestData}
              onMapClick={handleMapClick}
              clickedData={clickedData}
              onViewHistory={handleViewRegionDetail}
              onViewDetail={handleViewDetail}
            />
            <Text size="sm" c="dimmed" mt="sm">* Клікніть на будь-яку точку на карті, щоб переглянути якість повітря. Натисніть «Історія та прогноз» для детального аналізу.</Text>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder mt="lg">
            <Title order={4} mb="md">Довідник показників</Title>
            <Accordion variant="separated">
              <Accordion.Item value="aqi">
                <Accordion.Control icon={<IconInfoCircle size={20} color="teal" />}>Індекс якості повітря (AQI)</Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm" mb="xs">AQI (Air Quality Index) — це показник, що відображає рівень забруднення повітря за шкалою від 1 до 5:</Text>
                  <SimpleGrid cols={5} spacing="xs">
                    <Paper p="xs" radius="sm" withBorder style={{ borderLeft: '3px solid #00E400' }}>
                      <Text fw={600} size="sm">1 — Добре</Text>
                      <Text size="xs" c="dimmed">Якість повітря прийнятна</Text>
                    </Paper>
                    <Paper p="xs" radius="sm" withBorder style={{ borderLeft: '3px solid #FFFF00' }}>
                      <Text fw={600} size="sm">2 — Задовільно</Text>
                      <Text size="xs" c="dimmed">Допустимо для більшості</Text>
                    </Paper>
                    <Paper p="xs" radius="sm" withBorder style={{ borderLeft: '3px solid #FF7E00' }}>
                      <Text fw={600} size="sm">3 — Помірно</Text>
                      <Text size="xs" c="dimmed">Чутливим людям варто обмежити</Text>
                    </Paper>
                    <Paper p="xs" radius="sm" withBorder style={{ borderLeft: '3px solid #FF0000' }}>
                      <Text fw={600} size="sm">4 — Погано</Text>
                      <Text size="xs" c="dimmed">Шкідливо для здоров'я</Text>
                    </Paper>
                    <Paper p="xs" radius="sm" withBorder style={{ borderLeft: '3px solid #8F3F97' }}>
                      <Text fw={600} size="sm">5 — Дуже погано</Text>
                      <Text size="xs" c="dimmed">Небезпечно для всіх</Text>
                    </Paper>
                  </SimpleGrid>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="pm">
                <Accordion.Control icon={<IconDroplet size={20} color="orange" />}>Тверді частинки (PM2.5 та PM10)</Accordion.Control>
                <Accordion.Panel>
                  <Text size="sm">
                    <b>PM2.5</b> — частинки діаметром менше 2.5 мкм. Проникають глибоко в легені та кров'яне русло, спричиняючи серцево-судинні та респіраторні захворювання. Норма ВООЗ: до 15 μg/m³ (середньодобова).
                  </Text>
                  <Text size="sm" mt="xs">
                    <b>PM10</b> — частинки діаметром менше 10 мкм. Осідають у верхніх дихальних шляхах, подразнюють слизову. Норма ВООЗ: до 45 μg/m³ (середньодобова).
                  </Text>
                </Accordion.Panel>
              </Accordion.Item>
              <Accordion.Item value="gases">
                <Accordion.Control icon={<IconCloudFog size={20} color="blue" />}>Гази (O3, NO2, CO, SO2)</Accordion.Control>
                <Accordion.Panel>
                  <SimpleGrid cols={2} spacing="md">
                    <Paper p="sm" radius="sm" withBorder>
                      <Text fw={600} size="sm">O3 (Озон)</Text>
                      <Text size="xs" c="dimmed">Приземний озон подразнює дихальні шляхи. Утворюється внаслідок фотохімічних реакцій. Норма: до 100 μg/m³ (8-годинна).</Text>
                    </Paper>
                    <Paper p="sm" radius="sm" withBorder>
                      <Text fw={600} size="sm">NO2 (Діоксид азоту)</Text>
                      <Text size="xs" c="dimmed">Утворюється від вихлопних газів авто, сприяє утворенню смогу та кислотних дощів. Норма: до 25 μg/m³.</Text>
                    </Paper>
                    <Paper p="sm" radius="sm" withBorder>
                      <Text fw={600} size="sm">CO (Чадний газ)</Text>
                      <Text size="xs" c="dimmed">Отруйний газ без запаху та кольору. Знижує здатність крові переносити кисень. Норма: до 4 mg/m³.</Text>
                    </Paper>
                    <Paper p="sm" radius="sm" withBorder>
                      <Text fw={600} size="sm">SO2 (Діоксид сірки)</Text>
                      <Text size="xs" c="dimmed">Утворюється при спалюванні вугілля та нафти. Подразнює органи дихання. Норма: до 40 μg/m³.</Text>
                    </Paper>
                  </SimpleGrid>
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="lg" radius="md" withBorder mt="lg">
            <Title order={4} mb="md">Середні показники по регіонах</Title>
            <Text size="sm" c="dimmed" mb="sm">Клікніть на рядок, щоб переглянути історію та прогноз для регіону</Text>
            <Table.ScrollContainer minWidth={800}>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Регіон</Table.Th>
                    <Table.Th>Сер. AQI</Table.Th>
                    <Table.Th>Сер. PM2.5 (μg/m³)</Table.Th>
                    <Table.Th>Сер. PM10 (μg/m³)</Table.Th>
                    <Table.Th>Сер. NO2 (μg/m³)</Table.Th>
                    <Table.Th>Сер. CO (μg/m³)</Table.Th>
                    <Table.Th>Кількість вимірів</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Detail modal with history & forecast */}
      <Modal
        opened={detailOpened}
        onClose={closeDetail}
        title={
          <Group gap="sm">
            <ThemeIcon variant="light" color="teal" size="lg" radius="md">
              <IconChartLine size={20} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={700} size="lg">{detailLocationName}</Text>
              <Text size="xs" c="dimmed">
                {detailCoords.lat && detailCoords.lon
                  ? `Координати: ${parseFloat(detailCoords.lat).toFixed(4)}, ${parseFloat(detailCoords.lon).toFixed(4)}`
                  : ''}
              </Text>
            </Stack>
          </Group>
        }
        size="xl"
        zIndex={1000}
        overlayProps={{ zIndex: 999 }}
      >
        <SegmentedControl
          value={detailTab}
          onChange={setDetailTab}
          fullWidth
          mb="md"
          color="teal"
          data={[
            { label: '📊 Історія (7 днів)', value: 'history' },
            { label: '🔮 Прогноз', value: 'forecast' },
          ]}
        />

        {detailLoading ? (
          <Center p="xl"><Loader color="teal" type="dots" /></Center>
        ) : activeChartData.length === 0 ? (
          <Center p="xl">
            <Stack align="center" gap="sm">
              <IconHistory size={48} color="gray" />
              <Text ta="center" c="dimmed">
                {detailTab === 'history' ? 'Немає історичних даних за останні 7 днів' : 'Немає даних прогнозу'}
              </Text>
            </Stack>
          </Center>
        ) : (
          <Stack gap="lg">
            <Text fw={500} size="sm" c="dimmed" ta="center">
              {detailTab === 'history'
                ? '📈 Дані за останні 7 днів (кожні 4 години)'
                : '🔮 Прогноз якості повітря на найближчі дні'}
            </Text>

            {/* AQI chart */}
            <Card withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
              <Group justify="space-between" mb="sm">
                <Text fw={700} size="md">🌡️ Індекс якості повітря (AQI)</Text>
                <Badge color="teal" variant="light" size="sm">Шкала: 1-5</Badge>
              </Group>
              <LineChart
                h={250}
                data={activeChartData}
                dataKey="date"
                series={[{ name: 'AQI', color: 'teal.5', label: 'AQI' }]}
                curveType="monotone"
                strokeWidth={3}
                withDots
                dotProps={{ r: 3 }}
                tooltipAnimationDuration={200}
                gridProps={{ strokeDasharray: '3 3' }}
                yAxisProps={{ domain: [0, 5], tickCount: 6 }}
                xAxisProps={{ angle: -30, tickSize: 10, height: 60 }}
                valueFormatter={(value) => `${value} (${value <= 1 ? 'Добре' : value <= 2 ? 'Задовільно' : value <= 3 ? 'Помірно' : value <= 4 ? 'Погано' : 'Дуже погано'})`}
              />
            </Card>

            {/* Particles chart */}
            <Card withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
              <Group justify="space-between" mb="sm">
                <Text fw={700} size="md">💨 Тверді частинки</Text>
                <Badge color="orange" variant="light" size="sm">μg/m³</Badge>
              </Group>
              <LineChart
                h={250}
                data={activeChartData}
                dataKey="date"
                series={[
                  { name: 'PM2.5', color: 'blue.5', label: 'PM2.5 (дрібні)' },
                  { name: 'PM10', color: 'orange.5', label: 'PM10 (великі)' },
                ]}
                curveType="monotone"
                strokeWidth={2}
                withDots
                dotProps={{ r: 2 }}
                withLegend
                legendProps={{ verticalAlign: 'bottom' }}
                tooltipAnimationDuration={200}
                gridProps={{ strokeDasharray: '3 3' }}
                xAxisProps={{ angle: -30, tickSize: 10, height: 60 }}
                valueFormatter={(value) => `${value} μg/m³`}
              />
            </Card>

            {/* Gases chart */}
            <Card withBorder radius="md" p="md" bg="var(--mantine-color-dark-7)">
              <Group justify="space-between" mb="sm">
                <Text fw={700} size="md">🏭 Гази</Text>
                <Badge color="violet" variant="light" size="sm">μg/m³</Badge>
              </Group>
              <LineChart
                h={250}
                data={activeChartData}
                dataKey="date"
                series={[
                  { name: 'NO2', color: 'violet.5', label: 'NO₂ (діоксид азоту)' },
                  { name: 'O3', color: 'cyan.5', label: 'O₃ (озон)' },
                ]}
                curveType="monotone"
                strokeWidth={2}
                withDots
                dotProps={{ r: 2 }}
                withLegend
                legendProps={{ verticalAlign: 'bottom' }}
                tooltipAnimationDuration={200}
                gridProps={{ strokeDasharray: '3 3' }}
                xAxisProps={{ angle: -30, tickSize: 10, height: 60 }}
                valueFormatter={(value) => `${value} μg/m³`}
              />
            </Card>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}

