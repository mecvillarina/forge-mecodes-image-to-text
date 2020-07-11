import ForgeUI, {
  render,
  Fragment,
  Macro,
  Text,
  Button,
  Form,
  TextField,
  useAction,
  useState,
  Image,
  ModalDialog,
  Table,
  Cell,
  Row,
  TextArea,
} from "@forge/ui";

import api from "@forge/api";
import { useContentProperty } from "@forge/ui-confluence";

const IMAGE_TO_TEXT_API =
  "https://atlassian-forge-functions.azurewebsites.net/api/ocr/ReadText";

const App = () => {
  const [contentData, setContentData] = useContentProperty(
    "image-textvalue-data",
    {}
  );

  const [isModelOpen, setModalOpen] = useState(false);
  const [modalErrorMessage, setModalErrorMessage] = useState("");
  const [modalHasData, setModalHasData] = useState(false);
  const [modalImageTitle, setModalImageTitle] = useState("");
  const [modalTextValue, setModalTextValue] = useState("");

  const [hasData, setHasData] = useState(false);
  const [uiPageImageTitle, setUIPageImageTitle] = useState("");
  const [uiPageTextValue, setUIPageTextValue] = useState("");

  const [localData, setLocalData] = useAction(
    async (_, newValue) => {
      if (newValue["textValue"] != null) {
        await setContentData(newValue);
        setHasData(true);
      } else {
        await setContentData({});
        setHasData(false);
      }
      return newValue;
    },
    () => {
      if (contentData["textValue"] != null) {
        setHasData(true);
        setUIPageImageTitle(contentData["imageTitle"]);
        setUIPageTextValue(contentData["textValue"]);
        return contentData;
      }

      setHasData(false);
      return {};
    }
  );

  async function fetchTextFromImage(imagePath) {
    const imageToTextResponse = await api.fetch(
      `${IMAGE_TO_TEXT_API}?imagePath=${imagePath}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
        },
      }
    );

    await checkResponse("Image To Text", imageToTextResponse);
    var isSuccess = false;

    if (imageToTextResponse.ok) {
      const { textValue } = await imageToTextResponse.json();
      isSuccess = true;
      return { isSuccess, textValue };
    }

    return { isSuccess };
  }

  async function processData({ imageTitle, imagePath }) {
    setModalErrorMessage("");

    const { isSuccess, textValue } = await fetchTextFromImage(imagePath);
    if (isSuccess && textValue != "") {
      setModalErrorMessage("");
      setModalImageTitle(imageTitle);
      setModalTextValue(textValue);
      setModalHasData(true);
    } else {
      setModalErrorMessage(
        "Can't read any text with the given image path. Please make sure the image path is correct."
      );
    }
  }

  function updateData() {
    setModalOpen(true);
    setModalErrorMessage("");
    setModalImageTitle(uiPageImageTitle);
    setModalTextValue(uiPageTextValue);
    setModalHasData(true);
  }

  async function saveData({ imageTitle, textValue }) {
    var jsonData = {
      imageTitle: imageTitle,
      textValue: textValue,
    };

    setLocalData(jsonData);
    setModalHasData(false);
    setModalOpen(false);
    setUIPageImageTitle(imageTitle);
    setUIPageTextValue(textValue);
  }

  return (
    <Fragment>
      {!hasData && (
        <Fragment>
          <Text format="markdown">**Image-To-Text**</Text>
          <Button
            text="Select an Image"
            onClick={() => setModalOpen(true)}
          ></Button>
        </Fragment>
      )}
      {hasData && (
        <Fragment>
          <Text format="markdown">{`**${uiPageImageTitle}**`}</Text>
          <Button text="Update" onClick={() => updateData()}></Button>
          <Text>{uiPageTextValue}</Text>
        </Fragment>
      )}
      {isModelOpen && (
        <ModalDialog header="Image-To-Text" onClose={() => setModalOpen(false)}>
          {!modalHasData && (
            <Form onSubmit={processData} submitButtonText="Process">
              <TextField name="imageTitle" isRequired label="Title" />
              <TextField name="imagePath" isRequired label="Image Path" />
              {modalErrorMessage && <Text>{modalErrorMessage}</Text>}
            </Form>
          )}

          {modalHasData && (
            <Form onSubmit={saveData} submitButtonText="Save">
              <Text>Update the text value result as needed.</Text>
              <TextField
                name="imageTitle"
                isRequired
                label="Title"
                defaultValue={modalImageTitle}
              />
              <TextArea
                name="textValue"
                isRequired
                label="Converted text from Image"
                defaultValue={modalTextValue}
              />
              {modalErrorMessage && <Text>{modalErrorMessage}</Text>}
            </Form>
          )}
        </ModalDialog>
      )}
    </Fragment>
  );
};

export const run = render(<Macro app={<App />} />);

async function checkResponse(apiName, response) {
  if (!response.ok) {
    const message = `Error from ${apiName}: ${
      response.status
    } ${await response.text()}`;
    console.error(message);
  }
}
