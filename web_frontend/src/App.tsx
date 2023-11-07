import { useEffect, useState } from "react";
import {
  Box,
  Container,
  ContainerProps,
  Flex,
  FlexProps,
  Image,
  MantineProvider,
  ScrollArea,
  Transition,
  createPolymorphicComponent,
  createStyles,
} from "@mantine/core";
import Sidebar from "./components/Sidebar";
import PageView from "./components/PageView";
import { AgentName, Entity } from "./types";
import ReferenceCard from "./components/ReferenceCard";
import Cookies from "js-cookie";
import axiosClient from "./axiosConfig";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import "./index.css";
import SettingsModal from "./components/SettingsModal";
import { UI_POLL_ENDPOINT } from "./serverEndpoints";
import { motion } from "framer-motion";
import { theme } from "./theme";

// animate-able components for framer-motion
// https://github.com/orgs/mantinedev/discussions/1169#discussioncomment-5444975
const PFlex = createPolymorphicComponent<'div', FlexProps>(Flex)
const PContainer = createPolymorphicComponent<'div', ContainerProps>(Container)

const useStyles = createStyles((theme) => ({
  root: {
    height: "100vh",
    width: "100vw",
    background: "var(--bg-gradient-full---blue, linear-gradient(180deg, #191A27 2.23%, #14141D 25.74%, #14141D 49.42%, #14141D 73.62%, #14141D 96.28%))",
    overflow: "clip",
  },

  card: { backgroundColor: theme.white, borderRadius: "0.25rem" },

  container: {
    width: "100%",
    height: "100%",
    padding: 0,
    flex: "1 1 0"
  },
}));

export default function App() {
  const { classes } = useStyles();

  // TODO: remove test card
  const [entities, setEntities] = useState<Entity[]>([
    {
      name: "Doppler Effect",
      summary: "The change in the frequency of a wave.",
      image_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Doppler_effect_diagrammatic.svg/520px-Doppler_effect_diagrammatic.svg.png",
      url: "https://en.wikipedia.org/wiki/Doppler_effect",
      uuid: "test id 2",
    },
    {
      agent_insight: "90% of waves have a frequency of 100 Hz.",
      image_url:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Redshift.svg/340px-Redshift.svg.png",
      url: "https://en.wikipedia.org/wiki/Doppler_effect",
      agent_name: AgentName.STATISTICIAN,
      uuid: "test id 1",
    },
  ]);
  const [mountedIds, setMountedIds] = useState(new Set<string>());
  const [explicitInsights, setExplicitInsights] = useState<Entity[]>([]);
  const [viewMoreUrl, setViewMoreUrl] = useState<string | undefined>();
  const [showExplorePane, setShowExplorePane] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | undefined>();
  const [loadingViewMore, setLoadingViewMore] = useState(false);

  const [opened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const smallerThanMedium = useMediaQuery("(max-width: 62em)");

  const toggleSettings = () => {
    if (opened) {
      closeSettings();
    } else {
      openSettings();
    }
  };

  const initUserId = () => {
    let userId = Cookies.get("userId");
    if (userId == undefined || userId == null || userId == "") {
      console.log("No userID detected - generating random userID");
      userId = generateRandomUserId();
    } else {
      console.log("Previous userId found: " + userId);
    }
    setUserIdAndDeviceId(userId);
  };

  const generateRandomUserId = () => {
    const rand = "x"
      .repeat(5)
      .replace(
        /./g,
        () =>
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[
            Math.floor(Math.random() * 62)
          ]
      );
    return "WebFrontend_" + rand;
  };

  const setUserIdAndDeviceId = (newUserId: string) => {
    window.userId = newUserId;
    Cookies.set("userId", newUserId, { expires: 9999 });
    window.deviceId = "CSEWebFrontendDefault";
  };

  //poll the backend for UI updates
  const updateUiBackendPoll = () => {
    const uiPollRequstBody = {
      features: ["contextual_search_engine", "proactive_agent_insights", "explicit_agent_insights", "agent_chat"], //list of features here
      userId: window.userId,
      deviceId: window.deviceId,
    };

    axiosClient
      .post(UI_POLL_ENDPOINT, uiPollRequstBody)
      .then((res) => {
        // const newEntitiesDict = res.data.result;
        // if (res.data.success) console.log(res.data);
        // if (
        //   res.data.result && (res.data.result_agent_insights as any[]).length > 0
        // ) {
        //   const newEntitiesArray = Object.keys(newEntitiesDict).map(function (
        //     k
        //   ) {
        //     return newEntitiesDict[k];
        //   });
        //   console.log(newEntitiesArray);
        //   setEntities((entities) => [...entities, ...newEntitiesArray]);
        // }
        // if (
        //   res.data.result_agent_insights &&
        //   (res.data.result_agent_insights as any[]).length > 0
        // ) {
        //   console.log("Insights:", res.data.result_agent_insights);
        // }
        
        if (res.data.success) {
          const newEntities = res.data.result as any[];
          const newInsights = (res.data.results_proactive_agent_insights as any[]) || [];
          const newExplicitQueries = (res.data.explicit_insight_queries as any[]) || [];
          const newExplicitInsights = (res.data.explicit_insight_results as any[]) || [];

          if (newEntities.length === 0 && newInsights.length === 0 && newExplicitQueries.length === 0 && newExplicitInsights.length === 0) return;

          setEntities((entities) => [
            ...entities,
            ...newEntities,
            ...newInsights,
          ]);

          setExplicitInsights((explicitInsights) => [
            ...explicitInsights,
            ...newExplicitQueries,
            ...newExplicitInsights
          ])

          console.log(res.data)
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  };

  // HACK: delay mount reference cards when entities change
  useEffect(() => {
    setTimeout(
      () => setMountedIds(new Set([...entities.map((entity) => entity.uuid)])),
      100
    );}, [entities]);

  useEffect(() => {
    initUserId();
    setInterval(() => {
      updateUiBackendPoll();
    }, 1000);
  }, []);

  return (
    <MantineProvider withGlobalStyles withNormalizeCSS theme={theme}>
      <PFlex component={motion.div} className={classes.root} layout>
        <Sidebar settingsOpened={opened} toggleSettings={toggleSettings} />
        <PContainer
          component={motion.div}
          layout
          fluid
          className={classes.container}
          w={showExplorePane ? "50%" : "100%"}
          pt={"2rem"}
          px={"1rem"}
        >
          {entities.length === 0 && (
            <Box w="50%" mx="auto" mt="xl">
              <Image src={"/blobs.gif"} fit="cover" />
            </Box>
          )}
          {/* Left Panel */}
          <ScrollArea scrollHideDelay={100} h="100%">
            {entities
              .slice(0)
              .reverse()
              .map((entity, i) => (
                <Transition
                  mounted={mountedIds.has(entity.uuid)}
                  transition="slide-down"
                  duration={800}
                  timingFunction="ease"
                  key={`entity-${entity.uuid}`}
                >
                  {(styles) => (
                    <motion.div style={styles} layout>
                      <ReferenceCard
                        entity={entity}
                        selected={selectedCardId === entity.uuid}
                        onClick={() => {
                          setSelectedCardId(
                            entity.uuid === selectedCardId
                              ? undefined
                              : entity.uuid
                          );
                          setViewMoreUrl(entity.url);
                          setShowExplorePane(entity.uuid !== selectedCardId);
                        }}
                        large={i === 0}
                      />
                    </motion.div>
                  )}
                </Transition>
              ))}
          </ScrollArea>
        </PContainer>

        <PContainer
          component={motion.div}
          layout
          sx={{
            flex: showExplorePane ? "1 1 0" : "0",
          }}
        >
          <Transition
            mounted={showExplorePane}
            transition="slide-left"
            duration={400}
            timingFunction="ease"
          >
            {(styles) => (
              <motion.div style={{ ...styles, height: "100%" }}>
                <PageView
                  viewMoreUrl={viewMoreUrl}
                  loading={loadingViewMore}
                  setLoading={setLoadingViewMore}
                  onClose={() => setShowExplorePane(false)}
                />
              </motion.div>
            )}
          </Transition>
        </PContainer>
      </PFlex>

      <SettingsModal
        smallerThanMedium={smallerThanMedium}
        opened={opened}
        closeSettings={closeSettings}
        setUserIdAndDeviceId={setUserIdAndDeviceId}
      />
    </MantineProvider>
  );
}
