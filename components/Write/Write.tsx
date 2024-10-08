import { Collapse, Form, Input, Button, App } from "antd";
import { useEffect, useState } from "react";
import { NetworkOrigin, Network } from "@/config/index";
import type { AbiItem } from "@/units/index";
import { ethers } from "ethers";

import ConnectMetamask from "../ConnectMetamask/ConnectMetamask";

const Label = ({ name, type }: { name: string; type: string }) => {
  return (
    <span>
      <strong>{name}</strong>
      <span style={{ color: "#999" }}>[{type}]</span>
    </span>
  );
};

const FormContent = ({
  inputs,
  contract,
  name,
  origin,
}: {
  name: AbiItem["name"];
  inputs: AbiItem["inputs"];
  contract: any;
  origin: string;
}) => {
  const [form] = Form.useForm();

  const [txList, setTxList] = useState<{ hash: string; status: boolean }[]>([]);

  const { message } = App.useApp();

  const onSubmit = async () => {
    const data = await form.validateFields();
    const params = inputs.reduce((pre, cur) => {
      let val = data[cur.name];
      if (cur.type.includes("uint")) {
        val = Number(val);
      }
      return [...pre, val];
    }, []);

    if (!contract) {
      message.error("please connect to MetaMask");
      return;
    }

    const action = contract[name];
    try {
      const tx = await action.apply(null, params);
      setTxList((_t) => [..._t, { hash: tx.hash, status: false }]);
      // 等待交易被确认
      const receipt = await tx.wait();
      setTxList((_txList) => {
        return _txList.map((_newTxList) => {
          if (_newTxList.hash === tx.hash) {
            _newTxList.status = true;
          }
          return _newTxList;
        });
      });
    } catch (error) {
      //@ts-ignore
      message.error(error.message);
    }
  };

  const loading = !!txList.find((v) => !v.status);

  return (
    <>
      <Form form={form}>
        {inputs.map((v, i) => {
          return (
            <Form.Item
              style={{ marginBottom: 0 }}
              key={`${v.name}_${i}`}
              name={v.name}
              label={<Label name={v.name} type={v.type}></Label>}
              rules={[{ required: true, message: `Please input ${v.name}!` }]}
            >
              <Input placeholder={`Please input ${v.name}.`}></Input>
            </Form.Item>
          );
        })}
      </Form>

      <Button loading={loading} type="primary" size="small" onClick={onSubmit}>
        {loading ? "Waiting for transaction..." : "submit"}
      </Button>

      <div>
        {txList.map((v) => (
          <div key={v.hash}>
            hash:
            <a target="_blank" href={`${origin}/tx/${v.hash}`}>
              {v.hash}
            </a>
          </div>
        ))}
      </div>
    </>
  );
};

const Write = ({
  abiList,
  network,
  address,
  checkedAbi,
}: {
  abiList: AbiItem[];
  network: Network;
  address: string;
  checkedAbi: string[];
}) => {
  const origin = (network && NetworkOrigin[network].origin) || "";

  const [contract, setContract] = useState<any>();

  const [signer, setSigner] = useState<any>(null);

  useEffect(() => {
    setSigner(null);
  }, [abiList, address]);

  useEffect(() => {
    if (signer) {
      const _constract = new ethers.Contract(address, abiList, signer);
      setContract(_constract);
    } else {
      setContract(null);
    }
  }, [signer]);

  return (
    <>
      <ConnectMetamask signer={signer} setSigner={setSigner} network={network}></ConnectMetamask>

      <Collapse
        items={abiList
          .filter((v) => checkedAbi.includes(v.name))
          .map((item, i) => {
            return {
              key: `${item.name}_${i}`,
              label: item.name,
              children: (
                <FormContent
                  origin={origin}
                  inputs={item.inputs}
                  contract={contract}
                  name={item.name}
                ></FormContent>
              ),
            };
          })}
      />
    </>
  );
};

export default Write;
